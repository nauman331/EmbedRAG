import dotenv from 'dotenv';
dotenv.config();
import express, { type Request, type Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { connectDB } from './config/db.js';
import knowledgeRoutes from './routes/knowledge.route';
import botRoutes from './routes/bot.route';
import { generateBotResponse } from './ai/agent.js';
import Conversation from "./models/conversation.model"
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth.route';
import conversationRoutes from './routes/conversation.route';
import leadRoutes from './routes/lead.routes';
import { apiLimiter, aiOperationLimiter } from './middlewares/rate.middleware';

const app = express();
app.use(cookieParser());
app.use(helmet());
app.set('trust proxy', 1);

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
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/knowledge', aiOperationLimiter, knowledgeRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/leads', leadRoutes);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
});


app.set('io', io);

io.on('connection', (socket: Socket) => {
    console.log(`⚡ [Socket connected]: Client ID ${socket.id}`);

    socket.on('join_session', (sessionId: string) => {
        socket.join(sessionId);
        console.log(`User joined session room: ${sessionId}`);
    });

    socket.on('chat_message', async (data: { botId: string, message: string, history: any[], sessionId: string }) => {
        console.log(`💬 Received message for Bot ${data.botId}: "${data.message}"`);
        const { botId, sessionId, message, history } = data;

        socket.join(sessionId);

        try {
            const botObjectId = new mongoose.Types.ObjectId(botId);

            let convo = await Conversation.findOne({ botId: botObjectId, sessionId });
            if (!convo) {
                convo = await Conversation.create({ botId: botObjectId, sessionId, messages: [] });
            }

            convo.messages.push({ role: 'user', content: message, createdAt: new Date() } as any);
            await convo.save();

            if (convo.isHumanHandoff) {
                console.log(`⏸️ AI Skipped. Human is handling session: ${sessionId}`);
                const autoReply = "*(System: Your message has been sent to our live team. A human agent will reply shortly.)*";

                convo.messages.push({ role: 'bot', content: autoReply, createdAt: new Date() } as any);
                await convo.save();

                io.to(sessionId).emit('bot_response_chunk', { chunk: autoReply });
                io.to(sessionId).emit('bot_response_done');
                return;
            }

            const stream = await generateBotResponse(botId, message, history);
            let fullBotResponse = '';

            for await (const chunk of stream) {
                fullBotResponse += chunk;
                io.to(sessionId).emit('bot_response_chunk', { chunk });
            }

            if (fullBotResponse && fullBotResponse.trim() !== '') {
                convo.messages.push({ role: 'bot', content: fullBotResponse, createdAt: new Date() } as any);
                await convo.save();
            }

            io.to(sessionId).emit('bot_response_done');

        } catch (error: any) {
            console.error('Error generating bot response:', error);
            io.to(data.sessionId).emit('bot_error', {
                error: error.message || 'I encountered an error while thinking. Please try again.'
            });
        }
    });

    socket.on('admin_chat_message', async (data: { botId: string, message: string, sessionId: string }) => {
        console.log(`👨‍💼 Admin sent message for Bot ${data.botId}: "${data.message}"`);
        const { botId, sessionId, message } = data;

        try {
            const botObjectId = new mongoose.Types.ObjectId(botId);

            let convo = await Conversation.findOne({ botId: botObjectId, sessionId });
            if (!convo) {
                console.warn(`Admin tried to reply to a non-existent conversation: ${sessionId}`);
                return;
            }

            convo.messages.push({ role: 'admin', content: message, createdAt: new Date() } as any);
            await convo.save();

            io.to(sessionId).emit('bot_response_chunk', { chunk: message });
            io.to(sessionId).emit('bot_response_done');

        } catch (error: any) {
            console.error('Error sending admin response:', error);
            socket.emit('admin_error', {
                error: error.message || 'Encountered an error sending the message.'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket disconnected]: Client ID ${socket.id}`);
    });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Embed RAG Backend is running.' });
});

server.listen(port, () => {
    console.log(`[Server]: Backend is running at http://localhost:${port}`);
    console.log(`[WebSockets]: Socket.io is actively listening for connections.`);
});