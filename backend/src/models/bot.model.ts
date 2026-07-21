import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBot extends Document {
    tenantId: Types.ObjectId;
    name: string;
    llmProvider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
    llmModel: string;
    systemPrompt: string;
    welcomeMessage: string;
    colorHex: string;
    isLive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BotSchema: Schema = new Schema(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true
        },
        llmProvider: {
            type: String,
            enum: ['OPENAI', 'ANTHROPIC', 'GEMINI'],
            default: 'OPENAI',
            required: true
        },
        llmModel: {
            type: String,
            default: 'gpt-4o-mini',
            required: true
        },
        systemPrompt: {
            type: String,
            default: "You are a helpful AI assistant. Answer questions based only on the provided context.",
        },
        welcomeMessage: {
            type: String,
            default: "Hi there! How can I help you today?",
        },
        colorHex: {
            type: String,
            default: "#000000",
        },
        isLive: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

export default mongoose.model<IBot>('Bot', BotSchema);