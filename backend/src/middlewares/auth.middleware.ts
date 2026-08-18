import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Bot from '../models/bot.model.js';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
    };
}

/**
 * Verifies a Bearer JWT access token. Attaches decoded user info to req.user.
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): any => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or malformed token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
        req.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId
        };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
    }
};

/**
 * Verifies the authenticated user's tenant owns the bot specified in req.params.id or req.params.botId.
 * Must be used AFTER requireAuth.
 */
export const requireBotOwnership = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
        const botId = req.params.id || req.params.botId;
        if (!botId) {
            return res.status(400).json({ error: 'Bad Request: Bot ID is missing from request parameters.' });
        }

        const bot = await Bot.findById(botId).lean();
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }

        if (bot.tenantId.toString() !== req.user?.tenantId) {
            // Return 404 instead of 403 to avoid leaking that the resource exists
            return res.status(404).json({ error: 'Bot not found.' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ error: 'Authorization check failed.' });
    }
};