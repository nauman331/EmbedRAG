import { Request, Response } from "express";
import Bot from "../models/bot.model";

export const getBotConfig = async (req: Request, res: Response) => {
    try {
        const botId = req.params.id;
        const bot = await Bot.findById(botId);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }
        return res.status(200).json(bot);
    } catch (error) {
        console.error('Error fetching bot:', error);
        return res.status(500).json({ error: 'Failed to fetch bot configuration.' });

    }
}

export const updateBotConfig = async (req: Request, res: Response) => {
    try {
        const botId = req.params.id;
        const { name, systemPrompt, welcomeMessage, colorHex } = req.body;
        const updatedBot = await Bot.findByIdAndUpdate(botId, { name, systemPrompt, welcomeMessage, colorHex }, { new: true, runValidators: true });
        if (!updatedBot) {
            return res.status(404).json({ error: 'Bot not found.' });
        }

        return res.status(200).json({
            message: 'Bot updated successfully!',
            bot: updatedBot
        });
    } catch (error: any) {
        console.error('Error updating bot:', error);
        return res.status(500).json({ error: 'Failed to update bot configuration.' });
    }
}

export const getEmbedScript = async (req: Request, res: Response) => {
    try {
        const botId = req.params.id;
        const bot = await Bot.findById(botId);
        if (!bot) {
            return res.status(404).send('console.error("EmbedAI: Bot not found");');
        }
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
}