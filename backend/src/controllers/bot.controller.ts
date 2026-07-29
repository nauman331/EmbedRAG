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