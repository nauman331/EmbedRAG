import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.modal';
import Tenant from '../models/tenant.model';
import RefreshToken, { IRefreshToken } from '../models/refreshtoken.model';
import UAParser from 'ua-parser-js';

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET!;
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET!;

const setRefreshTokenCookie = (res: Response, token: string) => {
    res.cookie('jwt_refresh', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const extractDeviceInfo = (req: Request) => {
    const uaHeader = req.headers['user-agent'];
    const uaString = Array.isArray(uaHeader) ? uaHeader[0] : uaHeader || 'Unknown';

    const parser = new (UAParser as any)(uaString);
    const result = parser.getResult();

    const rawIp = req.ip || req.headers['x-forwarded-for'] || 'Unknown';
    let ipAddress = Array.isArray(rawIp) ? rawIp[0] : rawIp;

    if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
    }

    return {
        userAgent: uaString,
        ipAddress: ipAddress as string,
        deviceType: (result.device?.type || result.os?.name || 'Desktop') as string
    };
};

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password, companyName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email is already in use.' });

        const tenant = await Tenant.create({ email, companyName });
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await User.create({
            email,
            passwordHash,
            tenantId: tenant._id
        });

        return res.status(201).json({ message: 'User registered successfully. Please log in.' });
    } catch (error: any) {
        console.error('Registration Error:', error);
        return res.status(500).json({ error: 'Server error during registration.' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

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
        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
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
    res.clearCookie('jwt_refresh', { httpOnly: true, secure: true, sameSite: 'strict' });

    try {
        const foundToken = await RefreshToken.findOne({ token: currentRefreshToken });

        if (!foundToken || foundToken.revoked) {
            try {
                const decoded: any = jwt.verify(currentRefreshToken, getRefreshSecret());
                console.warn(`🚨 BREACH DETECTED for User ${decoded.userId}. Revoking ALL tokens.`);
                await RefreshToken.updateMany({ userId: decoded.userId }, { $set: { revoked: true } });
            } catch (err) { }
            return res.status(403).json({ error: 'Security breach detected. Please log in again.' });
        }

        const decoded: any = jwt.verify(currentRefreshToken, getRefreshSecret());
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'User not found.' });

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
            token: newRefreshToken,
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
    await RefreshToken.findOneAndUpdate({ token: refreshToken }, { revoked: true });
    res.clearCookie('jwt_refresh', { httpOnly: true, secure: true, sameSite: 'strict' });

    return res.status(200).json({ message: 'Logged out successfully.' });
};


export const getActiveSessions = async (req: any, res: Response): Promise<any> => {
    try {
        const userId = req.user.userId;
        const currentRefreshToken = req.cookies?.jwt_refresh;

        const sessions = await RefreshToken.find({ userId, revoked: false }).select('-token').sort({ createdAt: -1 });

        let currentSessionId = null;
        if (currentRefreshToken) {
            const currentSession = await RefreshToken.findOne({ token: currentRefreshToken });
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

        const result = await RefreshToken.findOneAndUpdate({
            _id: sessionIdToRevoke,
            userId
        }, { revoked: true });

        if (!result) {
            return res.status(404).json({ error: 'Session not found or already deleted.' });
        }

        return res.status(200).json({ message: 'Device logged out successfully.' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to revoke session' });
    }
};