import { Request, Response } from 'express';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import Tenant from '../models/tenant.model';
import KnowledgeSource from '../models/knowledge.model';
import DocumentChunk from '../models/documentchunk.model';
import mongoose from 'mongoose';

const storage = multer.memoryStorage();
export const upload = multer({ storage })

export const uploadKnowledge = async (req: Request, res: Response): Promise<any> => {
    try {
        const { tenantId, botId } = req.body;
        const file = req.file;

        if (!file || !tenantId || !botId) {
            return res.status(400).json({ error: 'Missing file, tenantId, or botId.' });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant || !tenant.apiKeys?.openai) {
            return res.status(400).json({ error: 'Tenant not found or missing OpenAI API Key for embeddings.' });
        }

        const knowledgeSource = await KnowledgeSource.create({
            tenantId,
            botId,
            type: 'PDF',
            sourceName: file.originalname,
            status: 'PROCESSING'
        });

        const parsePdf = (pdfParseModule as any).default || pdfParseModule;
        const pdfData = await parsePdf(file.buffer);
        const rawText = pdfData.text;

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await textSplitter.createDocuments([rawText]);

        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: tenant.apiKeys.openai,
            modelName: 'text-embedding-3-small',
        });

        const textsToEmbed = docs.map(doc => doc.pageContent);
        const vectorArrays = await embeddings.embedDocuments(textsToEmbed);

        const chunkDocs = docs.map((doc, index) => ({
            tenantId: new mongoose.Types.ObjectId(tenantId),
            botId: new mongoose.Types.ObjectId(botId),
            sourceId: knowledgeSource._id,
            text: doc.pageContent,
            embedding: vectorArrays[index]
        }));

        await DocumentChunk.insertMany(chunkDocs);

        knowledgeSource.status = 'COMPLETED';
        knowledgeSource.chunkCount = chunkDocs.length;
        await knowledgeSource.save();

        return res.status(200).json({
            message: 'Knowledge base updated successfully!',
            sourceId: knowledgeSource._id,
            chunksCreated: chunkDocs.length
        });

    } catch (error) {
        console.error('Error processing knowledge upload:', error);
        return res.status(500).json({ error: 'Failed to process document.' });
    }
};