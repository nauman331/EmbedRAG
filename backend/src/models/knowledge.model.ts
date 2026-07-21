import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKnowledgeSource extends Document {
    botId: Types.ObjectId;
    tenantId: Types.ObjectId;
    type: 'PDF' | 'URL' | 'TEXT';
    sourceName: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    chunkCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeSourceSchema: Schema = new Schema(
    {
        botId: {
            type: Schema.Types.ObjectId,
            ref: 'Bot',
            required: true,
            index: true,
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['PDF', 'URL', 'TEXT'],
            required: true,
        },
        sourceName: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
            default: 'PENDING',
        },
        chunkCount: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

export default mongoose.model<IKnowledgeSource>('KnowledgeSource', KnowledgeSourceSchema);