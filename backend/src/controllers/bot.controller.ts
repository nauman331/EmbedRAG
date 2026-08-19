import { Request, Response } from 'express';
import Bot from '../models/bot.model.js';
import Tenant from '../models/tenant.model.js';
import SemanticCache from '../models/semanticcache.model.js';
import Conversation from '../models/conversation.model.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import mongoose from 'mongoose';

export const getWorkspaceBots = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const tenantId = req.user?.tenantId;
        const bots = await Bot.find({ tenantId });
        return res.status(200).json(bots);
    } catch (error: any) {
        console.error('Error fetching workspace bots:', error);
        return res.status(500).json({ error: 'Failed to fetch your bots.' });
    }
};

export const createWorkspaceBot = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const tenantId = req.user?.tenantId;
        const tenant = await Tenant.findById(tenantId);
        
        if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

        const newBot = await Bot.create({
            tenantId,
            name: `${tenant.companyName} Support Agent`,
            llmProvider: 'GEMINI',
            llmModel: 'gemini-3.6-flash',
            systemPrompt: `You are a helpful customer support agent for ${tenant.companyName}. Answer questions based only on the provided knowledge base.`,
            welcomeMessage: `Hi there! Welcome to ${tenant.companyName}. How can I help you today?`,
            colorHex: '#059669'
        });

        return res.status(201).json(newBot);
    } catch (error: any) {
        console.error('Error creating workspace bot:', error);
        return res.status(500).json({ error: 'Failed to create bot.' });
    }
};

/**
 * Returns the bot config. API keys are NEVER returned — the frontend
 * should only show masked indicators (e.g. "Key configured ✓").
 */
export const getBotConfig = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const botId = req.params.id;
        const bot = await Bot.findById(botId);

        if (!bot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }

        const tenant = await Tenant.findById(bot.tenantId);

        // Mask API keys — indicate whether they are configured, never expose the raw value
        const maskedApiKeys = {
            openai: tenant?.apiKeys?.openai ? '****configured****' : '',
            anthropic: tenant?.apiKeys?.anthropic ? '****configured****' : '',
            gemini: tenant?.apiKeys?.gemini ? '****configured****' : ''
        };

        const responseData = {
            ...bot.toObject(),
            apiKeys: maskedApiKeys
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        console.error('Error fetching bot:', error);
        return res.status(500).json({ error: 'Failed to fetch bot configuration.' });
    }
};

export const updateBotConfig = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const botId = req.params.id;
        const {
            name,
            systemPrompt,
            welcomeMessage,
            colorHex,
            llmProvider,
            llmModel,
            apiKeys
        } = req.body;

        const updatedBot = await Bot.findByIdAndUpdate(
            botId,
            {
                name,
                systemPrompt,
                welcomeMessage,
                colorHex,
                llmProvider,
                llmModel
            },
            { new: true, runValidators: true }
        );

        if (!updatedBot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }

        // Only update API keys if explicitly provided and non-empty (don't wipe existing keys with masked values)
        if (apiKeys) {
            const keyUpdate: Record<string, string> = {};
            if (apiKeys.openai && !apiKeys.openai.includes('****')) keyUpdate['apiKeys.openai'] = apiKeys.openai;
            if (apiKeys.anthropic && !apiKeys.anthropic.includes('****')) keyUpdate['apiKeys.anthropic'] = apiKeys.anthropic;
            if (apiKeys.gemini && !apiKeys.gemini.includes('****')) keyUpdate['apiKeys.gemini'] = apiKeys.gemini;

            if (Object.keys(keyUpdate).length > 0) {
                await Tenant.findByIdAndUpdate(updatedBot.tenantId, { $set: keyUpdate });
            }
        }

        return res.status(200).json({
            message: 'Bot settings updated successfully!',
            bot: updatedBot
        });
    } catch (error: any) {
        console.error('Error updating bot:', error);
        return res.status(500).json({ error: 'Failed to update bot configuration.' });
    }
};

export const getEmbedScript = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.id;
        const frontendUrl = process.env.FRONTEND_URL;

        // The script validates postMessage origin to prevent cross-origin spoofing
        const script = `
            (function() {
                var allowedOrigin = '${frontendUrl}';
                var iframe = document.createElement('iframe');
                iframe.src = allowedOrigin + '/widget/${botId}';
                iframe.style.position = 'fixed';
                iframe.style.bottom = '0';
                iframe.style.right = '0';
                iframe.style.width = '100px';
                iframe.style.height = '100px';
                iframe.style.border = 'none';
                iframe.style.zIndex = '999999';
                iframe.style.backgroundColor = 'transparent';
                iframe.setAttribute('allowtransparency', 'true');
                iframe.id = 'embedai-iframe';

                // Validate origin before resizing to prevent postMessage spoofing
                window.addEventListener('message', function(e) {
                    if (e.origin !== allowedOrigin) return;
                    if (e.data === 'embedai-open') {
                        iframe.style.width = '420px';
                        iframe.style.height = '700px';
                    } else if (e.data === 'embedai-close') {
                        iframe.style.width = '100px';
                        iframe.style.height = '100px';
                    }
                });

                document.body.appendChild(iframe);
            })();
        `;

        res.setHeader('Content-Type', 'application/javascript');
        return res.send(script);
    } catch (error) {
        console.error('Error generating embed script:', error);
        return res.status(500).send('console.error("EmbedAI: Failed to load widget");');
    }
};

/**
 * Returns REAL analytics derived from MongoDB data (not mock values).
 */
export const getBotAnalytics = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = String(req.params.id);
        const botObjectId = new mongoose.Types.ObjectId(botId);

        const [cacheHits, totalConversations, chartData] = await Promise.all([
            SemanticCache.countDocuments({ botId: botObjectId }),
            Conversation.countDocuments({ botId: botObjectId }),

            // Real per-day query aggregation for the last 7 days
            Conversation.aggregate([
                {
                    $match: {
                        botId: botObjectId,
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        queries: { $sum: { $size: '$messages' } }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Fill in any missing days in the last 7 days with 0
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0];
        });

        const chartDataMap = new Map<string, number>(chartData.map((d: any) => [d._id as string, d.queries as number]));
        const formattedChartData = last7Days.map(day => ({
            day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
            queries: chartDataMap.get(day) || 0,
            cacheHits: 0 // Per-day cache hits require a separate aggregation; total shown in stats
        }));

        const savedCost = (cacheHits * 0.002).toFixed(4);

        return res.status(200).json({
            totalConversations,
            cacheHits,
            savedCost,
            chartData: formattedChartData
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics.' });
    }
};