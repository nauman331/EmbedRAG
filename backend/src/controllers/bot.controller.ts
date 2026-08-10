import { Request, Response } from 'express';
import Bot from '../models/bot.model';
import Tenant from '../models/tenant.model';
import SemanticCache from '../models/semanticcache.model';
import Conversation from '../models/conversation.model';


export const getBotConfig = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.id;
        const bot = await Bot.findById(botId);

        if (!bot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }

        const tenant = await Tenant.findById(bot.tenantId);

        const responseData = {
            ...bot.toObject(),
            apiKeys: tenant?.apiKeys || { openai: '', anthropic: '', gemini: '' }
        };

        return res.status(200).json(responseData);
    } catch (error: any) {
        console.error('Error fetching bot:', error);
        return res.status(500).json({ error: 'Failed to fetch bot configuration.' });
    }
};

export const updateBotConfig = async (req: Request, res: Response): Promise<any> => {
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

        if (apiKeys) {
            await Tenant.findByIdAndUpdate(
                updatedBot.tenantId,
                { $set: { apiKeys: apiKeys } }
            );
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

        const script = `
            (function() {
                var iframe = document.createElement('iframe');
                iframe.src = '${frontendUrl}/widget/${botId}';
                iframe.style.position = 'fixed';
                iframe.style.bottom = '0';
                iframe.style.right = '0';
                
                // Start closed (small bubble size)
                iframe.style.width = '100px';
                iframe.style.height = '100px';
                iframe.style.border = 'none';
                iframe.style.zIndex = '999999';
                iframe.style.backgroundColor = 'transparent';
                iframe.allowTransparency = 'true';
                iframe.id = 'embedai-iframe';
                
                // Listen for open/close events from the React ChatWidget inside the iframe
                window.addEventListener('message', function(e) {
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

export const getBotAnalytics = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.id;

        const cacheHits = await SemanticCache.countDocuments({ botId });
        const totalConversations = await Conversation.countDocuments({ botId });

        const savedCost = (cacheHits * 0.002).toFixed(4);

        const chartData = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                queries: Math.floor(Math.random() * 50) + 20,
                cacheHits: Math.floor(Math.random() * 20) + 5
            };
        });

        return res.status(200).json({
            totalConversations,
            cacheHits,
            savedCost,
            chartData
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics.' });
    }
};