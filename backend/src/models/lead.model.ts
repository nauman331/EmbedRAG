import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILead extends Document {
    botId: Types.ObjectId;
    name: string;
    email: string;
    status: 'NEW' | 'CONTACTED';
    createdAt: Date;
    updatedAt: Date;
}

const LeadSchema: Schema = new Schema(
    {
        botId: {
            type: Schema.Types.ObjectId,
            ref: 'Bot',
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        email: { type: String, required: true },
        status: {
            type: String,
            enum: ['NEW', 'CONTACTED'],
            default: 'NEW',
        }
    },
    { timestamps: true }
);

export default mongoose.model<ILead>('Lead', LeadSchema);