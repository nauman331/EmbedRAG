import dotenv from 'dotenv';
dotenv.config();
import express, { type Request, type Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { connectDB } from './config/db.js';

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

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket: Socket) => {
    console.log(`[Socket connected]: Client ID ${socket.id}`);
    socket.on('audio_stream_chunk', (audioData: ArrayBuffer) => {
    });
    socket.on('disconnect', () => {
        console.log(`[Socket disconnected]: Client ID ${socket.id}`);
    });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Screened SaaS Backend is running.' });
});

server.listen(port, () => {
    console.log(`[Server]: Backend is running at http://localhost:${port}`);
    console.log(`[WebSockets]: Socket.io is actively listening for connections.`);
});