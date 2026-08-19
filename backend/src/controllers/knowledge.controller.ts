import { Request, Response } from 'express';
import multer from 'multer';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import Tenant from '../models/tenant.model.js';
import KnowledgeSource from '../models/knowledge.model.js';
import DocumentChunk from '../models/documentchunk.model.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import mongoose from 'mongoose';

// --- Multer configuration with security constraints ---
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB maximum
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF files are accepted.'));
        }
    }
});

export const uploadKnowledge = async (req: AuthRequest, res: Response): Promise<any> => {
    // knowledgeSource may be created before the error — hold a reference for cleanup
    let knowledgeSource: any = null;

    try {
        // tenantId comes from the verified JWT — never from user-supplied body
        const tenantId = req.user?.tenantId;
        const { botId } = req.body;
        const file = req.file;

        if (!file || !botId) {
            return res.status(400).json({ error: 'Missing file or botId.' });
        }

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const tenant = await Tenant.findById(tenantId);
        if (!tenant || !tenant.apiKeys?.gemini) {
            return res.status(400).json({ error: 'Missing Gemini API Key. Please add it in Dashboard → Settings.' });
        }

        knowledgeSource = await KnowledgeSource.create({
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
            model: process.env.EMBEDDING_MODEL || 'text-embedding-004',
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

    } catch (error: any) {
        console.error('Error processing knowledge upload:', error);

        // Mark the record as FAILED so it doesn't stay stuck as PROCESSING
        if (knowledgeSource) {
            try {
                knowledgeSource.status = 'FAILED';
                await knowledgeSource.save();
            } catch (saveErr) {
                console.error('Failed to update knowledge source status to FAILED:', saveErr);
            }
        }

        // Handle Multer file size error
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large. Maximum size is 10 MB.' });
        }
        // Handle Multer MIME filter error
        if (error.message?.includes('Invalid file type')) {
            return res.status(415).json({ error: error.message });
        }
        // Handle Gemini API auth / quota errors
        if (error?.status === 401 || error?.status === 429 || error?.message?.includes('API key')) {
            return res.status(401).json({
                error: '🔒 Authentication or Quota failed with Gemini. Please check your API key in the dashboard.'
            });
        }

        return res.status(500).json({ error: 'Failed to process document. Please try again.' });
    }
};

export const getKnowledgeSources = async (req: Request, res: Response): Promise<any> => {
    try {
        const botId = req.params.botId;
        const sources = await KnowledgeSource.find({ botId }).sort({ createdAt: -1 });
        return res.status(200).json(sources);
    } catch (error) {
        console.error('Error fetching knowledge sources:', error);
        return res.status(500).json({ error: 'Failed to fetch knowledge sources' });
    }
};

export const deleteKnowledgeSource = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const sourceId = req.params.sourceId;

        // Verify ownership: the source must belong to the authenticated user's tenant
        const source = await KnowledgeSource.findById(sourceId);
        if (!source) {
            return res.status(404).json({ error: 'Knowledge source not found.' });
        }
        if (source.tenantId.toString() !== req.user?.tenantId) {
            return res.status(404).json({ error: 'Knowledge source not found.' });
        }

        await DocumentChunk.deleteMany({ sourceId });
        await KnowledgeSource.findByIdAndDelete(sourceId);

        return res.status(200).json({ message: 'Document and vector chunks deleted successfully.' });
    } catch (error) {
        console.error('Error deleting knowledge source:', error);
        return res.status(500).json({ error: 'Failed to delete knowledge source' });
    }
};