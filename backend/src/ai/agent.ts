import { ChatOpenAI } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { OpenAIEmbeddings } from '@langchain/openai';
import mongoose from 'mongoose';
import Bot from '../models/bot.model';
import Tenant from '../models/tenant.model';

export const generateBotResponse = async (botId: string, userMessage: string, history: any[] = []) => {
    const bot = await Bot.findById(botId);
    if (!bot) throw new Error('Bot not found.');

    const tenant = await Tenant.findById(bot.tenantId);
    if (!tenant) throw new Error('Tenant not found.');

    const openaiKey = tenant.apiKeys?.openai || '';

    if (!openaiKey || openaiKey.includes('put_your') || openaiKey.trim() === '') {
        throw new Error('⚠️ Please add a valid OpenAI API Key in your dashboard for vector embeddings.');
    }

    let llmKey = '';
    if (bot.llmProvider === 'OPENAI') llmKey = openaiKey;
    else if (bot.llmProvider === 'ANTHROPIC') llmKey = tenant.apiKeys?.anthropic || '';
    else if (bot.llmProvider === 'GEMINI') llmKey = tenant.apiKeys?.gemini || '';

    if (!llmKey || llmKey.trim() === '') {
        throw new Error(`⚠️ Please add a valid ${bot.llmProvider} API Key in your dashboard to activate the chat model.`);
    }

    try {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: openaiKey,
            modelName: 'text-embedding-3-small',
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

        const llm = new ChatOpenAI({
            openAIApiKey: llmKey,
            modelName: bot.llmModel || 'gpt-4o-mini',
            temperature: 0.2,
        });

        const promptTemplate = PromptTemplate.fromTemplate(`
            ${bot.systemPrompt}
            
            Answer the user's question using ONLY the following context. 
            If you cannot answer the question based on the context, politely say that you don't know.
            
            Context:
            {context}

            Question: {question}

            Answer:
        `);

        const ragChain = RunnableSequence.from([
            {
                context: async (input: { question: string }) => {
                    const relevantDocs = await retriever.invoke(input.question);
                    return relevantDocs.map(doc => doc.pageContent).join('\n\n');
                },
                question: new RunnablePassthrough()
            },
            promptTemplate,
            llm,
            new StringOutputParser()
        ]);

        const answer = await ragChain.invoke({ question: userMessage });

        return answer;

    } catch (error: any) {
        if (error?.status === 401 || error?.message?.includes('Incorrect API key')) {
            throw new Error(`🔒 Authentication failed with ${bot.llmProvider}. Please check your API key in the dashboard.`);
        }
        throw error;
    }
};