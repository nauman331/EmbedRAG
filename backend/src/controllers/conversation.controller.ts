import { Request, Response } from 'express';
import Conversation from '../models/conversation.model';

export const getConversations = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.botId;
        const convos = await Conversation.find({ botId }).sort({ updatedAt: -1 });
        return res.status(200).json(convos);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

export const takeOverConversation = async (req: Request, res: Response): Promise<any> => {
    try {
        const sessionId = req.params.sessionId;
        const convo = await Conversation.findOneAndUpdate(
            { sessionId },
            { isHumanHandoff: true },
            { new: true }
        );
        return res.status(200).json(convo);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to take over conversation' });
    }
};

export const adminReply = async (req: Request, res: Response): Promise<any> => {
    try {
        const sessionId = req.params.sessionId;
        const { message } = req.body;

        const convo = await Conversation.findOneAndUpdate(
            { sessionId },
            {
                $push: { messages: { role: 'admin', content: message } },
                isHumanHandoff: true
            },
            { new: true }
        );

        const io = req.app.get('io');
        if (io) {
            io.to(sessionId).emit('bot_response_chunk', { chunk: message });
            io.to(sessionId).emit('bot_response_done');
        }

        return res.status(200).json(convo);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send reply' });
    }
};