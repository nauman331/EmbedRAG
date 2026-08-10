import { Request, Response } from 'express';
import Lead from '../models/lead.model';

export const getLeads = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.botId;
        const leads = await Lead.find({ botId }).sort({ createdAt: -1 });
        return res.status(200).json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        return res.status(500).json({ error: 'Failed to fetch leads' });
    }
};