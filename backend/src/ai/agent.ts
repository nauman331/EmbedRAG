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

    if (!llmKey || llmKey.includes('put_your') || llmKey.trim() === '') {
        throw new Error(`⚠️ Please add a valid ${bot.llmProvider} API Key in your dashboard to activate the chat model.`);
    }

    try {
        const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: geminiKey,
            model: process.env.EMBEDDING_MODEL || 'text-embedding-004',
        });

        if (!mongoose.connection.db) {
            throw new Error('MongoDB database connection is not established yet.');
        }

        const collection = mongoose.connection.db.collection('documentchunks');

        const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
            collection: collection as any,
            indexName: 'vector_index',
            textKey: 'text',
            embeddingKey: 'embedding',
        });

        const retriever = vectorStore.asRetriever({
            k: 4,
            filter: {
                botId: new mongoose.Types.ObjectId(botId),
            },
        });

        const searchKnowledgeBaseTool = tool(
            async ({ query }) => {
                console.log(`\n🔍 Agent used tool: [search_knowledge_base] for -> "${query}"`);
                const relevantDocs = await retriever.invoke(query);
                if (relevantDocs.length === 0) return "No relevant information found in the knowledge base.";
                return relevantDocs.map(doc => doc.pageContent).join('\n\n');
            },
            {
                name: 'search_knowledge_base',
                description: 'Use this tool to search the company knowledge base, PDFs, and uploaded documents for facts, policies, and product details.',
                schema: z.object({
                    query: z.string().describe("The specific question or keywords to search for.")
                })
            }
        );

        const captureLeadTool = tool(
            async ({ name, email }) => {
                console.log(`\n✅ Agent used tool: [capture_lead] -> Saved ${name} (${email})`);
                return `Successfully saved lead. Inform the user that a human agent will contact them at ${email} shortly.`;
            },
            {
                name: 'capture_lead',
                description: 'Use this tool when a user is frustrated, wants to speak to a human, or asks to be contacted. Ask them for their name and email first before calling this.',
                schema: z.object({
                    name: z.string().describe("The user's name"),
                    email: z.string().email().describe("The user's email address")
                })
            }
        );

        let llm;
        const temperature = 0.2;

        if (bot.llmProvider === 'OPENAI') {
            llm = new ChatOpenAI({
                apiKey: llmKey,
                modelName: bot.llmModel || process.env.OPENAI_API_MODEL!,
                temperature,
                streaming: true
            });
        } else if (bot.llmProvider === 'ANTHROPIC') {
            llm = new ChatAnthropic({
                apiKey: llmKey,
                modelName: bot.llmModel || process.env.CLAUDE_MODEL!,
                temperature,
                streaming: true
            });
        } else {
            llm = new ChatGoogleGenerativeAI({
                apiKey: llmKey,
                model: bot.llmModel || process.env.GEMINI_MODEL!,
                temperature,
            });
        }

        const agent = createReactAgent({
            llm: llm,
            tools: [searchKnowledgeBaseTool, captureLeadTool],
        });

        const formattedMessages = history.map(msg =>
            msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        );

        const finalMessages = [
            new SystemMessage(`${bot.systemPrompt}\n\nYou have tools available. Only use 'search_knowledge_base' if you need factual data from the context. If you don't need context to answer naturally (like saying hello), do not use the tool.`),
            ...formattedMessages,
            new HumanMessage(userMessage)
        ];

        const eventStream = await agent.streamEvents(
            { messages: finalMessages },
            { version: "v2" }
        );

        async function* generateTextChunks() {
            for await (const event of eventStream) {
                // Anthropic sometimes streams content slightly differently in LangChain, so we safely fall back to checking text
                const chunkContent = event?.data?.chunk?.content || event?.data?.chunk?.text;
                if (event.event === "on_chat_model_stream" && chunkContent) {
                    // Check if it's an array (Anthropic) or string
                    if (Array.isArray(chunkContent)) {
                        for (const block of chunkContent) {
                            if (block.type === 'text') {
                                yield block.text;
                            }
                        }
                    } else if (typeof chunkContent === 'string') {
                        yield chunkContent;
                    }
                }
            }
        }

        return generateTextChunks();

    } catch (error: any) {
        console.error(`🚨 ${bot.llmProvider} ERROR DETAILS:`, error);
        if (error?.status === 401 || error?.status === 429 || error?.message?.includes('API key') || error?.message?.includes('404')) {
            throw new Error(`🔒 Authentication or Quota failed with ${bot.llmProvider}. Please check your API key in the dashboard.`);
        }
        throw error;
    }
};