import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDocumentChunk extends Document {
    botId: Types.ObjectId;
    tenantId: Types.ObjectId;
    sourceId: Types.ObjectId;
    text: string;
    embedding: number[];
    createdAt: Date;
    updatedAt: Date;
}

const DocumentChunkSchema: Schema = new Schema(
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
        },
        sourceId: {
            type: Schema.Types.ObjectId,
            ref: 'KnowledgeSource',
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
        },
        embedding: {
            type: [Number],
            required: true,
        }
    },
    { timestamps: true }
);

export default mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);