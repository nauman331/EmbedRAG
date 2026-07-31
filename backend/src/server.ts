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
app.use('/api/bots', botRoutes);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    console.log(`⚡ [Socket connected]: Client ID ${socket.id}`);

    socket.on('chat_message', async (data: { botId: string, message: string, history: any[], sessionId: string }) => {
        console.log(`💬 Received message for Bot ${data.botId}: "${data.message}"`);
        try {
            const stream = await generateBotResponse(data.botId, data.message, data.history);

            let fullBotResponse = '';

            for await (const chunk of stream) {
                fullBotResponse += chunk;
                socket.emit('bot_response_chunk', { chunk });
            }

            const botObjectId = new mongoose.Types.ObjectId(data.botId);

            await Conversation.findOneAndUpdate(
                { botId: botObjectId, sessionId: data.sessionId },
                {
                    $push: {
                        messages: {
                            $each: [
                                { role: 'user', content: data.message, createdAt: new Date() },
                                { role: 'bot', content: fullBotResponse, createdAt: new Date() }
                            ]
                        }
                    }
                },
                { upsert: true, new: true }
            );

            socket.emit('bot_response_done');

        } catch (error: any) {
            console.error('Error generating bot response:', error);
            socket.emit('bot_error', {
                error: error.message || 'I encountered an error while thinking. Please try again.'
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket disconnected]: Client ID ${socket.id}`);
    });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Screened SaaS Backend is running.' });
});

interface ConversationParams {
    botId: string;
}

app.get(
    '/api/conversations/:botId',
    async (
        req: Request<ConversationParams>,
        res: Response
    ): Promise<any> => {
        const botObjectId = new mongoose.Types.ObjectId(req.params.botId);

        const conversations = await Conversation.find({
            botId: botObjectId
        }).sort({ updatedAt: -1 });

        return res.json(conversations);
    }
);

server.listen(port, () => {
    console.log(`[Server]: Backend is running at http://localhost:${port}`);
    console.log(`[WebSockets]: Socket.io is actively listening for connections.`);
});