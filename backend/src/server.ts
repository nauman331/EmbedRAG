import dotenv from 'dotenv';
dotenv.config();
import express, { type Request, type Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { connectDB } from './config/db.js';
import knowledgeRoutes from './routes/knowledge.route'
import { generateBotResponse } from './ai/agent.js';

const app = express();

connectDB();

if (!process.env.PORT || !process.env.FRONTEND_URL) {
    throw new Error('One or more required environment variables are not defined');
}

const port = process.env.PORT;

const server = http.createServer(app);

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));

app.use(express.json());

app.use('/api/knowledge', knowledgeRoutes);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    console.log(`⚡ [Socket connected]: Client ID ${socket.id}`);
    socket.on('chat_message', async (data: { botId: string; message: string; history?: any[] }) => {
        try {
            console.log(`💬 Received message for Bot ${data.botId}: "${data.message}"`);
            const answer = await generateBotResponse(data.botId, data.message, data.history);
            socket.emit('bot_response', { answer });
        } catch (error: any) {
            console.error('Error generating bot response:', error);
            socket.emit('bot_error', { error: 'Sorry, I am having trouble connecting to my brain right now.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket disconnected]: Client ID ${socket.id}`);
    });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Screened SaaS Backend is running.' });
});

server.listen(port, () => {
    console.log(`[Server]: Backend is running at http://localhost:${port}`);
    console.log(`[WebSockets]: Socket.io is actively listening for connections.`);
});