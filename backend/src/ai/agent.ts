import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import mongoose from 'mongoose';
import Bot from '../models/bot.model.js';
import Tenant from '../models/tenant.model.js';
import SemanticCache from '../models/semanticcache.model.js';
import Lead from '../models/lead.model.js';
import logger from '../config/logger.js';

// --- LRU-style bounded caches to prevent memory leaks ---
const MAX_CACHE_SIZE = 100;

class LRUCache<K, V> extends Map<K, V> {
    private maxSize: number;

    constructor(maxSize: number) {
        super();
        this.maxSize = maxSize;
    }

    set(key: K, value: V): this {
        // Evict oldest entry if at capacity
        if (this.size >= this.maxSize) {
            const firstKey = this.keys().next().value;
            if (firstKey !== undefined) this.delete(firstKey);
        }
        return super.set(key, value);
    }
}

const embeddingCache = new LRUCache<string, GoogleGenerativeAIEmbeddings>(MAX_CACHE_SIZE);
const llmCache = new LRUCache<string, any>(MAX_CACHE_SIZE);

const getEmbeddings = (apiKey: string) => {
    if (!embeddingCache.has(apiKey)) {
        embeddingCache.set(apiKey, new GoogleGenerativeAIEmbeddings({
            apiKey,
            model: process.env.EMBEDDING_MODEL,
        }));
    }
    return embeddingCache.get(apiKey)!;
};

/**
 * Sanitize a string to prevent prompt injection from being stored in SemanticCache
 * or being passed as part of system context.
 */
const sanitizeForCache = (text: string): string => {
    // Remove common prompt injection patterns
    return text
        .replace(/\bignore\s+(all\s+)?previous\s+instructions?\b/gi, '[redacted]')
        .replace(/\bsystem\s+prompt\b/gi, '[redacted]')
        .replace(/<\/?script[^>]*>/gi, '') // Strip any HTML script tags
        .substring(0, 2000); // Cap length to prevent extremely long cache entries
};

export const generateBotResponse = async (botId: string, userMessage: string, sessionId: string) => {
    const bot = await Bot.findById(botId);
    if (!bot) throw new Error('Bot not found.');

    const tenant = await Tenant.findById(bot.tenantId);
    if (!tenant) throw new Error('Tenant not found.');

    const geminiKey = tenant.apiKeys?.gemini || process.env.GEMINI_API_KEY || '';
    if (!geminiKey || geminiKey.includes('put_your') || geminiKey.includes('****')) {
        throw new Error('⚠️ Please add a valid Gemini API Key in your dashboard settings.');
    }

    try {
        const embeddings = getEmbeddings(geminiKey);

        const questionEmbedding = await embeddings.embedQuery(userMessage);

        // --- Semantic Cache Check ---
        const cachedResults = await SemanticCache.aggregate([
            {
                $vectorSearch: {
                    index: 'cache_vector_index',
                    path: 'embedding',
                    queryVector: questionEmbedding,
                    numCandidates: 10,
                    limit: 1,
                    filter: { botId: new mongoose.Types.ObjectId(botId) }
                }
            },
            { $project: { answer: 1, score: { $meta: 'vectorSearchScore' } } }
        ]);

        if (cachedResults.length > 0 && cachedResults[0].score > 0.95) {
            logger.info(`⚡ CACHE HIT (Score: ${cachedResults[0].score.toFixed(3)}) for bot ${botId}`);
            async function* generateCachedChunks() { yield '⚡ ' + cachedResults[0].answer; }
            return generateCachedChunks();
        }

        logger.debug(`🐢 CACHE MISS — Invoking LangGraph Agent for bot ${botId}`);

        if (!mongoose.connection.db) throw new Error('MongoDB not connected.');
        const collection = mongoose.connection.db.collection('documentchunks');

        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection as any,
            indexName: 'vector_index',
            textKey: 'text',
            embeddingKey: 'embedding',
        });

        const retriever = vectorStore.asRetriever({ k: 4, filter: { botId: new mongoose.Types.ObjectId(botId) } });

        const searchKnowledgeBaseTool = tool(
            async ({ query, expandedQueries }) => {
                logger.debug(`[RAG TOOL] Searching: "${query}" + ${expandedQueries.length} variants`);

                const allResults = await Promise.all([
                    retriever.invoke(query),
                    ...expandedQueries.map(q => retriever.invoke(q))
                ]);

                const uniqueDocs = new Map();
                allResults.flat().forEach(doc => uniqueDocs.set(doc.pageContent, doc));

                const finalDocs = Array.from(uniqueDocs.values());
                if (finalDocs.length === 0) return 'No relevant information found in the knowledge base.';
                return finalDocs.map(doc => doc.pageContent).join('\n\n');
            },
            {
                name: 'search_knowledge_base',
                description: 'Search the company knowledge base. You MUST provide the original query AND 2 alternate phrasing variations to ensure a match.',
                schema: z.object({
                    query: z.string(),
                    expandedQueries: z.array(z.string()).describe('Provide 2-3 alternate ways to ask this question to broaden the search.')
                })
            }
        );

        const captureLeadTool = tool(
            async ({ name, email }) => {
                logger.info(`[LEAD TOOL] Capturing lead: ${name} <${email}> for bot ${botId}`);
                await Lead.create({ botId: new mongoose.Types.ObjectId(botId), name, email });
                return `Successfully saved lead. Inform the user that a human agent will contact them at ${email} shortly.`;
            },
            {
                name: 'capture_lead',
                description: 'Use this tool when a user is frustrated, wants to speak to a human, or asks to be contacted.',
                schema: z.object({ name: z.string(), email: z.string().email() })
            }
        );

        // --- LLM Selection ---
        let llmKey = '';
        if (bot.llmProvider === 'GEMINI') llmKey = geminiKey;
        else if (bot.llmProvider === 'OPENAI') llmKey = tenant.apiKeys?.openai || process.env.OPENAI_API_KEY || '';
        else if (bot.llmProvider === 'ANTHROPIC') llmKey = tenant.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY || '';

        const cacheKey = `${bot.llmProvider}_${bot.llmModel}_${botId}`;
        let llm = llmCache.get(cacheKey);

        if (!llm) {
            const temperature = 0.2;
            if (bot.llmProvider === 'OPENAI') {
                llm = new ChatOpenAI({ apiKey: llmKey, modelName: bot.llmModel, temperature, streaming: true });
            } else if (bot.llmProvider === 'ANTHROPIC') {
                llm = new ChatAnthropic({ apiKey: llmKey, modelName: bot.llmModel, temperature, streaming: true });
            } else {
                llm = new ChatGoogleGenerativeAI({ apiKey: llmKey, model: bot.llmModel, temperature });
            }
            llmCache.set(cacheKey, llm);
        }

        // --- Persistent checkpointer backed by MongoDB (survives restarts, shared across workers) ---
        const db = mongoose.connection.db;
        const checkpointer = new MongoDBSaver({
            client: mongoose.connection.getClient() as any,
            dbName: db!.databaseName
        });

        const agent = createReactAgent({
            llm,
            tools: [searchKnowledgeBaseTool, captureLeadTool],
            checkpointSaver: checkpointer,
            prompt: (state: any) => {
                // Filter out any poisoned SystemMessages stored in old checkpoints
                const filteredMessages = state.messages.filter((msg: any) => msg._getType() !== 'system');
                return [
                    new SystemMessage(`${bot.systemPrompt}\n\nYou have tools available. Only use 'search_knowledge_base' if you need factual data.`),
                    ...filteredMessages
                ];
            }
        });

        const finalMessages = [
            new HumanMessage(userMessage)
        ];

        const config = { configurable: { thread_id: sessionId } };

        const eventStream = await agent.streamEvents({ messages: finalMessages }, { ...config, version: 'v2' });

        async function* generateTextChunks() {
            let fullAgentResponse = '';
            for await (const event of eventStream) {
                const chunkContent = event?.data?.chunk?.content || event?.data?.chunk?.text;
                if (event.event === 'on_chat_model_stream' && chunkContent) {
                    if (Array.isArray(chunkContent)) {
                        for (const block of chunkContent) {
                            if (block.type === 'text') {
                                fullAgentResponse += block.text;
                                yield block.text;
                            }
                        }
                    } else if (typeof chunkContent === 'string') {
                        fullAgentResponse += chunkContent;
                        yield chunkContent;
                    }
                }
            }

            // Store sanitized response in SemanticCache for future hits
            if (fullAgentResponse.trim() !== '') {
                const sanitizedQuestion = sanitizeForCache(userMessage);
                const sanitizedAnswer = sanitizeForCache(fullAgentResponse);

                await SemanticCache.create({
                    botId: new mongoose.Types.ObjectId(botId),
                    question: sanitizedQuestion,
                    answer: sanitizedAnswer,
                    embedding: questionEmbedding
                });
            }
        }

        return generateTextChunks();

    } catch (error: any) {
        logger.error({ message: 'LangGraph Agent error', botId, error: error.message });
        throw error;
    }
};