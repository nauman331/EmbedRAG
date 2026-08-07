import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISemanticCache extends Document {
    botId: Types.ObjectId;
    question: string;
    answer: string;
    embedding: number[];
    createdAt: Date;
}

const SemanticCacheSchema: Schema = new Schema(
    {
        botId: {
            type: Schema.Types.ObjectId,
            ref: 'Bot',
            required: true,
            index: true,
        },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        embedding: {
            type: [Number],
            required: true,
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ISemanticCache>('SemanticCache', SemanticCacheSchema);