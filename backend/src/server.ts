import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';
import knowledgeRoutes from './routes/knowledge.route.js';
import botRoutes from './routes/bot.route.js';
import authRoutes from './routes/auth.route.js';
import conversationRoutes from './routes/conversation.route.js';
import leadRoutes from './routes/lead.routes.js';
import { apiLimiter, aiOperationLimiter } from './middlewares/rate.middleware.js';
import { initSocketHandlers } from './sockets/chat.socket.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';

// --- Environment validation on startup ---
const REQUIRED_ENV_VARS = [
    'PORT', 'FRONTEND_URL', 'MONGO_URI',
    'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'
];

for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
        logger.error(`FATAL: Required environment variable "${varName}" is not set. Exiting.`);
        process.exit(1);
    }
}

// Warn about weak defaults (common mistake when copying from .env.example)
if (
    process.env.JWT_ACCESS_SECRET === 'super_secret_access_key' ||
    process.env.JWT_REFRESH_SECRET === 'super_secret_refresh_key'
) {
    logger.warn('⚠️  WARNING: JWT secrets are using insecure default values. Generate strong secrets with: openssl rand -hex 64');
}

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cookieParser());
app.set('trust proxy', 1); // Trust first proxy (required for correct IP extraction behind load balancers)

// --- CORS ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')) // remove quotes and trailing slash
    .map(o => o.startsWith('http') ? o : `https://${o}`) // ensure protocol is present
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, health checks)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Safe fallback for Render preview environments / misconfigurations
        if (origin.endsWith('.onrender.com') || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        console.error(`🚨 CORS BLOCKED: Origin "${origin}" not in allowed list:`, allowedOrigins);
        return callback(new Error(`CORS: Origin ${origin} not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));

// --- Body parsing with size limit (prevents JSON payload DoS) ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Connect to Database ---
connectDB();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// --- Rate Limiting ---
app.use('/api', apiLimiter);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/knowledge', aiOperationLimiter, knowledgeRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/leads', leadRoutes);

// --- Health Check ---
app.get('/api/health', async (_req: Request, res: Response) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

    res.status(200).json({
        status: 'ok',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        db: dbStatus,
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: `${memMB} MB`
    });
});

// --- Socket.io ---
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in controllers (for HTTP-triggered socket emissions)
app.set('io', io);

// Initialize all socket handlers
initSocketHandlers(io);

// --- Global Error Handler (must be last middleware) ---
// Catches any errors thrown by route handlers or middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ message: 'Unhandled error', error: err.message, stack: err.stack });

    // CORS errors
    if (err.message?.startsWith('CORS:')) {
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
    }

    // Don't leak internal error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message;

    res.status(500).json({ error: message });
});

// --- Handle unhandled promise rejections (prevent silent crashes) ---
process.on('unhandledRejection', (reason) => {
    logger.error({ message: 'Unhandled Promise Rejection', reason });
});

process.on('uncaughtException', (error) => {
    logger.error({ message: 'Uncaught Exception', error: error.message, stack: error.stack });
    process.exit(1);
});

server.listen(port, () => {
    logger.info(`🚀 Backend running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`🔌 Socket.io initialized and listening`);
    logger.info(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
});