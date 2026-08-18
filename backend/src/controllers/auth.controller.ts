import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/user.model.js';
import Tenant from '../models/tenant.model.js';
import Bot from '../models/bot.model.js';
import RefreshToken, { IRefreshToken } from '../models/refreshtoken.model.js';
import * as UAParserPackage from 'ua-parser-js';

// --- Input Validation Schemas ---
export const registerSchema = z.object({
    email: z.string().email('Invalid email format.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.'),
    companyName: z.string().min(1, 'Company name is required.').max(100, 'Company name is too long.')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format.'),
    password: z.string().min(1, 'Password is required.')
});

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET!;
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET!;

/**
 * Hash a refresh token for safe storage in MongoDB.
 * If the DB is breached, raw token values cannot be reused.
 */
const hashToken = (token: string): string => {
    return crypto.createHmac('sha256', process.env.JWT_REFRESH_SECRET!).update(token).digest('hex');
};

const setRefreshTokenCookie = (res: Response, token: string) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('jwt_refresh', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

/**
 * Extracts and sanitizes IP address from the request.
 * Trusts X-Forwarded-For only when behind a known proxy (trust proxy enabled in server.ts).
 */
const extractDeviceInfo = (req: Request) => {
    const uaHeader = req.headers['user-agent'];
    const uaString = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader || 'Unknown';

    const UAParser = (UAParserPackage as any).UAParser || (UAParserPackage as any).default || UAParserPackage;
    const parser = new UAParser(uaString);
    const result = parser.getResult();

    // req.ip is already normalized when trust proxy is set in server.ts
    let ipAddress = req.ip || 'Unknown';

    // Remove IPv6 loopback prefix for cleaner display
    if (ipAddress === '::1') ipAddress = '127.0.0.1';
    if (ipAddress.startsWith('::ffff:')) ipAddress = ipAddress.replace('::ffff:', '');

    return {
        userAgent: uaString.substring(0, 512), // Prevent extremely long UA strings
        ipAddress,
        deviceType: (result.device?.type || result.os?.name || 'Desktop') as string
    };
};

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        // Input already validated by validate.middleware before reaching here
        const { email, password, companyName } = req.body;

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ error: 'Email is already in use.' });

        const tenant = await Tenant.create({ email: email.toLowerCase(), companyName });
        const salt = await bcrypt.genSalt(12); // 12 rounds for production strength
        const passwordHash = await bcrypt.hash(password, salt);

        await User.create({
            email: email.toLowerCase(),
            passwordHash,
            tenantId: tenant._id
        });

        await Bot.create({
            tenantId: tenant._id,
            name: `${companyName} Support Agent`,
            llmProvider: 'GEMINI',
            llmModel: 'gemini-2.0-flash',
            systemPrompt: `You are a helpful customer support agent for ${companyName}. Answer questions based only on the provided knowledge base.`,
            welcomeMessage: `Hi there! Welcome to ${companyName}. How can I help you today?`,
            colorHex: '#0b57d0'
        });

        return res.status(201).json({ message: 'Account created successfully. Please log in.' });
    } catch (error: any) {
        console.error('Registration Error:', error);
        return res.status(500).json({ error: 'Server error during registration.' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

        // Enforce max concurrent sessions — evict oldest if at limit
        const MAX_SESSIONS = 5;
        const activeSessionsCount = await RefreshToken.countDocuments({ userId: user._id, revoked: false });

        if (activeSessionsCount >= MAX_SESSIONS) {
            const oldestSession = await RefreshToken.findOne({ userId: user._id, revoked: false }).sort({ createdAt: 1 });
            if (oldestSession) {
                oldestSession.revoked = true;
                await oldestSession.save();
            }
        }

        const accessToken = jwt.sign(
            { userId: user._id, tenantId: user.tenantId },
            getAccessSecret(),
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            getRefreshSecret(),
            { expiresIn: '7d' }
        );

        const deviceInfo = extractDeviceInfo(req);

        // Store only the HASH of the refresh token in DB
        await RefreshToken.create({
            userId: user._id,
            token: hashToken(refreshToken),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deviceInfo
        });

        setRefreshTokenCookie(res, refreshToken);

        return res.status(200).json({
            message: 'Logged in successfully',
            accessToken,
            user: { id: user._id, email: user.email, tenantId: user.tenantId }
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Server error during login.' });
    }
};

export const refreshTokens = async (req: Request, res: Response): Promise<any> => {
    const cookies = req.cookies;
    if (!cookies?.jwt_refresh) {
        return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const currentRefreshToken = cookies.jwt_refresh;
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('jwt_refresh', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });

    try {
        // Verify the JWT signature first (catches expired/tampered tokens)
        const decoded: any = jwt.verify(currentRefreshToken, getRefreshSecret());

        // Look up by the HASH of the submitted token
        const hashedToken = hashToken(currentRefreshToken);
        const foundToken = await RefreshToken.findOne({ token: hashedToken });

        if (!foundToken || foundToken.revoked) {
            // Token reuse detected — nuclear revocation of ALL sessions for this user
            console.warn(`🚨 REFRESH TOKEN REUSE DETECTED for User ${decoded.userId}. Revoking ALL sessions.`);
            await RefreshToken.updateMany({ userId: decoded.userId }, { $set: { revoked: true } });
            return res.status(403).json({ error: 'Security alert: Session reuse detected. Please log in again.' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'User not found.' });

        // Rotate: revoke old token, issue fresh pair
        foundToken.revoked = true;
        await foundToken.save();

        const newAccessToken = jwt.sign(
            { userId: user._id, tenantId: user.tenantId },
            getAccessSecret(),
            { expiresIn: '15m' }
        );

        const newRefreshToken = jwt.sign(
            { userId: user._id },
            getRefreshSecret(),
            { expiresIn: '7d' }
        );

        await RefreshToken.create({
            userId: user._id,
            token: hashToken(newRefreshToken),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            deviceInfo: foundToken.deviceInfo
        });

        setRefreshTokenCookie(res, newRefreshToken);

        return res.status(200).json({ accessToken: newAccessToken });

    } catch (error: any) {
        return res.status(403).json({ error: 'Refresh token expired or invalid. Please log in.' });
    }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
    const cookies = req.cookies;
    if (!cookies?.jwt_refresh) return res.sendStatus(204);

    const refreshToken = cookies.jwt_refresh;
    const hashedToken = hashToken(refreshToken);
    await RefreshToken.findOneAndUpdate({ token: hashedToken }, { revoked: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('jwt_refresh', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });

    return res.status(200).json({ message: 'Logged out successfully.' });
};

export const getActiveSessions = async (req: any, res: Response): Promise<any> => {
    try {
        const userId = req.user.userId;
        const currentRefreshToken = req.cookies?.jwt_refresh;

        const sessions = await RefreshToken.find({ userId, revoked: false }).select('-token').sort({ createdAt: -1 });

        let currentSessionId = null;
        if (currentRefreshToken) {
            const hashedToken = hashToken(currentRefreshToken);
            const currentSession = await RefreshToken.findOne({ token: hashedToken });
            if (currentSession) currentSessionId = currentSession._id.toString();
        }

        const mappedSessions = sessions.map((session: IRefreshToken) => ({
            id: session._id,
            deviceType: session.deviceInfo?.deviceType || 'Unknown Device',
            ipAddress: session.deviceInfo?.ipAddress || 'Unknown IP',
            createdAt: session.createdAt,
            isCurrentDevice: session._id.toString() === currentSessionId
        }));

        return res.status(200).json(mappedSessions);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

export const revokeSession = async (req: any, res: Response): Promise<any> => {
    try {
        const userId = req.user.userId;
        const sessionIdToRevoke = req.params.sessionId;

        const result = await RefreshToken.findOneAndUpdate(
            { _id: sessionIdToRevoke, userId },
            { revoked: true }
        );

        if (!result) {
            return res.status(404).json({ error: 'Session not found or already deleted.' });
        }

        return res.status(200).json({ message: 'Device logged out successfully.' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to revoke session' });
    }
};