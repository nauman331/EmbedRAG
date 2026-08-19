import { Response } from 'express';
import Conversation from '../models/conversation.model.js';
import Bot from '../models/bot.model.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const getConversations = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const botId = req.params.botId;
        const convos = await Conversation.find({ botId }).sort({ updatedAt: -1 });
        return res.status(200).json(convos);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

/**
 * Verifies the authenticated tenant owns the conversation before allowing takeover.
 * Resolves: conversation routes had no ownership check — any tenant could hijack any conversation.
 */
export const takeOverConversation = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const sessionId = req.params.sessionId;
        const tenantId = req.user?.tenantId;

        // Find the conversation, then verify ownership via its bot
        const convo = await Conversation.findOne({ sessionId });
        if (!convo) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        const bot = await Bot.findById(convo.botId).lean();
        if (!bot || bot.tenantId.toString() !== tenantId) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        convo.isHumanHandoff = true;
        await convo.save();

        return res.status(200).json(convo);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to take over conversation' });
    }
};

/**
 * Verifies the authenticated tenant owns the conversation before allowing admin reply.
 * Resolves: conversation routes had no ownership check — any tenant could inject admin messages.
 */
export const adminReply = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const sessionId = req.params.sessionId;
        const { message } = req.body;
        const tenantId = req.user?.tenantId;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        // Verify ownership: resolve conversation → bot → tenant
        const convo = await Conversation.findOne({ sessionId });
        if (!convo) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        const bot = await Bot.findById(convo.botId).lean();
        if (!bot || bot.tenantId.toString() !== tenantId) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        convo.messages.push({ role: 'admin', content: message.trim(), createdAt: new Date() } as any);
        convo.isHumanHandoff = true;
        await convo.save();

        const io = req.app.get('io');
        if (io) {
            io.to(sessionId).emit('bot_response_chunk', { chunk: message.trim() });
            io.to(sessionId).emit('bot_response_done');
        }

        return res.status(200).json(convo);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send reply' });
    }
};