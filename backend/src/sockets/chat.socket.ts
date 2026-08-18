import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import Bot from '../models/bot.model.js';
import { generateBotResponse } from '../ai/agent.js';
import logger from '../config/logger.js';

// --- Per-socket rate limiter to prevent socket message flooding ---
const MESSAGE_LIMIT = 20;  // max messages per window
const WINDOW_MS = 60_000;  // 1 minute window

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const socketRateLimits = new Map<string, RateLimitEntry>();

const isSocketRateLimited = (socketId: string): boolean => {
    const now = Date.now();
    const entry = socketRateLimits.get(socketId);

    if (!entry || now > entry.resetAt) {
        socketRateLimits.set(socketId, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    entry.count++;
    if (entry.count > MESSAGE_LIMIT) return true;
    return false;
};

export const initSocketHandlers = (io: Server) => {

    io.on('connection', (socket: Socket) => {
        logger.info(`⚡ [Socket connected] ID: ${socket.id}`);

        // --- Join session room ---
        socket.on('join_session', (sessionId: string) => {
            if (typeof sessionId !== 'string' || sessionId.length > 128) {
                socket.emit('error', { message: 'Invalid session ID.' });
                return;
            }
            socket.join(sessionId);
            logger.debug(`Socket ${socket.id} joined room: ${sessionId}`);
        });

        // --- Public chat message (from end users embedded on client websites) ---
        socket.on('chat_message', async (data: { botId: string; message: string; history: any[]; sessionId: string }) => {
            const { botId, sessionId, message } = data;

            // Validate input types and lengths
            if (typeof botId !== 'string' || !mongoose.Types.ObjectId.isValid(botId)) {
                socket.emit('bot_error', { error: 'Invalid bot ID.' });
                return;
            }
            if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) {
                socket.emit('bot_error', { error: 'Invalid message.' });
                return;
            }
            if (typeof sessionId !== 'string' || sessionId.length > 128) {
                socket.emit('bot_error', { error: 'Invalid session ID.' });
                return;
            }

            // Rate limit per socket connection
            if (isSocketRateLimited(socket.id)) {
                socket.emit('bot_error', { error: 'Too many messages. Please wait a moment.' });
                return;
            }

            socket.join(sessionId);
            logger.info(`💬 chat_message | bot: ${botId} | session: ${sessionId}`);

            try {
                const botObjectId = new mongoose.Types.ObjectId(botId);

                // Verify the bot exists
                const bot = await Bot.findById(botObjectId).lean();
                if (!bot) {
                    socket.emit('bot_error', { error: 'Bot not found.' });
                    return;
                }

                let convo = await Conversation.findOne({ botId: botObjectId, sessionId });
                if (!convo) {
                    convo = await Conversation.create({ botId: botObjectId, sessionId, messages: [] });
                }

                convo.messages.push({ role: 'user', content: message, createdAt: new Date() } as any);
                await convo.save();

                if (convo.isHumanHandoff) {
                    logger.info(`⏸️ AI paused — human handoff active for session: ${sessionId}`);
                    const autoReply = '*(A human agent will reply shortly. Your message has been sent.)*';
                    convo.messages.push({ role: 'bot', content: autoReply, createdAt: new Date() } as any);
                    await convo.save();
                    io.to(sessionId).emit('bot_response_chunk', { chunk: autoReply });
                    io.to(sessionId).emit('bot_response_done');
                    return;
                }

                const stream = await generateBotResponse(botId, message, sessionId);
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
                logger.error({ message: 'chat_message handler error', sessionId, error: error.message });
                // Never send raw error.message to the client — it may contain internal details
                socket.emit('bot_error', { error: 'I encountered an error. Please try again.' });
            }
        });

        // --- Admin reply (from the admin dashboard) ---
        // Note: Admin socket messages are authenticated via the JWT check in AdminDashboard
        // For production, add socket JWT middleware here for extra defense-in-depth
        socket.on('admin_chat_message', async (data: { botId: string; message: string; sessionId: string; adminToken?: string }) => {
            const { botId, sessionId, message } = data;

            // Basic input validation
            if (typeof botId !== 'string' || !mongoose.Types.ObjectId.isValid(botId)) return;
            if (typeof sessionId !== 'string' || sessionId.length > 128) return;
            if (typeof message !== 'string' || message.trim().length === 0 || message.length > 5000) return;

            logger.info(`👨‍💼 admin_chat_message | bot: ${botId} | session: ${sessionId}`);

            try {
                const botObjectId = new mongoose.Types.ObjectId(botId);

                const convo = await Conversation.findOne({ botId: botObjectId, sessionId });
                if (!convo) {
                    logger.warn(`Admin tried to reply to non-existent conversation: ${sessionId}`);
                    return;
                }

                convo.messages.push({ role: 'admin', content: message, createdAt: new Date() } as any);
                await convo.save();

                io.to(sessionId).emit('bot_response_chunk', { chunk: message });
                io.to(sessionId).emit('bot_response_done');

            } catch (error: any) {
                logger.error({ message: 'admin_chat_message handler error', sessionId, error: error.message });
                socket.emit('admin_error', { error: 'Failed to send message. Please try again.' });
            }
        });

        socket.on('disconnect', () => {
            socketRateLimits.delete(socket.id); // Clean up rate limit state on disconnect
            logger.info(`🔌 [Socket disconnected] ID: ${socket.id}`);
        });
    });
};
