import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.modal';
import Tenant from '../models/tenant.model';
import RefreshToken from '../models/refreshtoken.model';

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

        await RefreshToken.create({
            userId: user._id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

                await RefreshToken.deleteMany({ userId: decoded.userId });
            } catch (err) {
                console.warn('🚨 Invalid refresh token detected. No user context available for revocation.');
            }
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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

    await RefreshToken.findOneAndDelete({ token: refreshToken });

    res.clearCookie('jwt_refresh', { httpOnly: true, secure: true, sameSite: 'strict' });

    return res.status(200).json({ message: 'Logged out successfully.' });
};