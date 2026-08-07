import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import mongoose from 'mongoose';
import Bot from '../models/bot.model';
import Tenant from '../models/tenant.model';
import SemanticCache from '../models/semanticcache.model';

export const generateBotResponse = async (botId: string, userMessage: string, history: any[] = []) => {
    const bot = await Bot.findById(botId);
    if (!bot) throw new Error('Bot not found.');

    const tenant = await Tenant.findById(bot.tenantId);
    if (!tenant) throw new Error('Tenant not found.');

    const geminiKey = tenant.apiKeys?.gemini || process.env.GEMINI_API_KEY || '';
    if (!geminiKey || geminiKey.includes('put_your') || geminiKey.trim() === '') {
        throw new Error('⚠️ Please add a valid Gemini API Key in your dashboard for vector embeddings.');
    }

    let llmKey = '';
    if (bot.llmProvider === 'GEMINI') llmKey = geminiKey;
    else if (bot.llmProvider === 'OPENAI') llmKey = tenant.apiKeys?.openai || process.env.OPENAI_API_KEY || '';
    else if (bot.llmProvider === 'ANTHROPIC') llmKey = tenant.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY || '';

    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: geminiKey,
            model: process.env.EMBEDDING_MODEL || 'text-embedding-004',
        });

        console.log(`\n🔍 Checking Semantic Cache for: "${userMessage}"...`);
        const questionEmbedding = await embeddings.embedQuery(userMessage);

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
            {
                $project: {
                    answer: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ]);

        if (cachedResults.length > 0 && cachedResults[0].score > 0.95) {
            console.log(`⚡ CACHE HIT! (Score: ${cachedResults[0].score}). Saving LLM costs.`);

            async function* generateCachedChunks() {
                yield "⚡ " + cachedResults[0].answer;
            }
            return generateCachedChunks();
        }

        console.log(`🐢 CACHE MISS. Booting up LangGraph Agent...`);

        if (!mongoose.connection.db) throw new Error('MongoDB database connection is not established yet.');
        const collection = mongoose.connection.db.collection('documentchunks');

        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection as any,
            indexName: 'vector_index',
            textKey: 'text',
            embeddingKey: 'embedding',
        });

        const retriever = vectorStore.asRetriever({ k: 4, filter: { botId: new mongoose.Types.ObjectId(botId) } });

        const searchKnowledgeBaseTool = tool(
            async ({ query }) => {
                console.log(`\n🔍 Agent used tool: [search_knowledge_base] for -> "${query}"`);
                const relevantDocs = await retriever.invoke(query);
                if (relevantDocs.length === 0) return "No relevant information found in the knowledge base.";
                return relevantDocs.map(doc => doc.pageContent).join('\n\n');
            },
            {
                name: 'search_knowledge_base',
                description: 'Search the company knowledge base for facts, policies, and product details.',
                schema: z.object({ query: z.string() })
            }
        );

        const captureLeadTool = tool(
            async ({ name, email }) => {
                console.log(`\n✅ Agent used tool: [capture_lead] -> Saved ${name} (${email})`);
                return `Successfully saved lead. Inform the user that a human agent will contact them at ${email} shortly.`;
            },
            {
                name: 'capture_lead',
                description: 'Use this tool when a user is frustrated, wants to speak to a human, or asks to be contacted.',
                schema: z.object({ name: z.string(), email: z.string().email() })
            }
        );

        let llm;
        const temperature = 0.2;

        if (bot.llmProvider === 'OPENAI') {
            llm = new ChatOpenAI({ apiKey: llmKey, modelName: bot.llmModel || 'gpt-4o-mini', temperature, streaming: true });
        } else if (bot.llmProvider === 'ANTHROPIC') {
            llm = new ChatAnthropic({ apiKey: llmKey, modelName: bot.llmModel || 'claude-3-haiku-20240307', temperature, streaming: true });
        } else {
            llm = new ChatGoogleGenerativeAI({ apiKey: llmKey, model: bot.llmModel || process.env.CHAT_MODEL || 'gemini-3.6-flash', temperature });
        }

        const agent = createReactAgent({
            llm: llm,
            tools: [searchKnowledgeBaseTool, captureLeadTool],
        });

        const formattedMessages = history.map(msg =>
            msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        );

        const finalMessages = [
            new SystemMessage(`${bot.systemPrompt}\n\nYou have tools available. Only use 'search_knowledge_base' if you need factual data from the context.`),
            ...formattedMessages,
            new HumanMessage(userMessage)
        ];

        const eventStream = await agent.streamEvents({ messages: finalMessages }, { version: "v2" });

        async function* generateTextChunks() {
            let fullAgentResponse = '';
            for await (const event of eventStream) {
                const chunkContent = event?.data?.chunk?.content || event?.data?.chunk?.text;
                if (event.event === "on_chat_model_stream" && chunkContent) {
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

            if (fullAgentResponse.trim() !== '') {
                console.log(`💾 Saving response to Semantic Cache...`);
                await SemanticCache.create({
                    botId: new mongoose.Types.ObjectId(botId),
                    question: userMessage,
                    answer: fullAgentResponse,
                    embedding: questionEmbedding
                });
            }
        }

        return generateTextChunks();

    } catch (error: any) {
        console.error(`🚨 ERROR DETAILS:`, error);
        throw error;
    }
};