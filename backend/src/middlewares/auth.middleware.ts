import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        tenantId: string;
    };
}

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