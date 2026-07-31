import { Request, Response } from 'express';
import multer from 'multer';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import Tenant from '../models/tenant.model';
import KnowledgeSource from '../models/knowledge.model';
import DocumentChunk from '../models/documentchunk.model';
import mongoose from 'mongoose';

const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const uploadKnowledge = async (req: Request, res: Response): Promise<any> => {
    try {
        const { tenantId, botId } = req.body;
        const file = req.file;

        if (!file || !tenantId || !botId) {
            return res.status(400).json({ error: 'Missing file, tenantId, or botId.' });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant || !tenant.apiKeys?.gemini) {
            return res.status(400).json({ error: 'Tenant not found or missing Gemini API Key for embeddings.' });
        }

        const knowledgeSource = await KnowledgeSource.create({
            tenantId,
            botId,
            type: 'PDF',
            sourceName: file.originalname,
            status: 'PROCESSING'
        });

        const blob = new Blob(
            [file.buffer as unknown as BlobPart],
            { type: 'application/pdf' }
        );
        const loader = new PDFLoader(blob);

        const rawDocs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await textSplitter.splitDocuments(rawDocs);

        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: tenant.apiKeys.gemini,
            model: 'text-embedding-004',
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

        await DocumentChunk.deleteMany({ botId: new mongoose.Types.ObjectId(botId) });

        await DocumentChunk.insertMany(chunkDocs);

        knowledgeSource.status = 'COMPLETED';
        knowledgeSource.chunkCount = chunkDocs.length;
        await knowledgeSource.save();

        return res.status(200).json({
            message: 'Knowledge base updated successfully!',
            sourceId: knowledgeSource._id,
            chunksCreated: chunkDocs.length
        });

    } catch (error: any) {
        console.error('Error processing knowledge upload:', error);

        if (error?.status === 401 || error?.status === 429 || error?.message?.includes('API key')) {
            return res.status(401).json({
                error: '🔒 Authentication or Quota failed with Gemini. Please check your API key in the dashboard.'
            });
        }

        return res.status(500).json({ error: error.message || 'Failed to process document.' });
    }
};