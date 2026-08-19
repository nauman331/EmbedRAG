import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage {
    role: 'user' | 'bot' | 'admin';
    content: string;
    createdAt: Date;
}

export interface IConversation extends Document {
    botId: Types.ObjectId;
    sessionId: string;
    messages: IMessage[];
    isHumanHandoff: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
    role: { type: String, enum: ['user', 'bot', 'admin'], required: true },
    content: { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now }
});

const ConversationSchema: Schema = new Schema(
    {
        botId: {
            type: Schema.Types.ObjectId,
            ref: 'Bot',
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        messages: [MessageSchema],
        isHumanHandoff: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

ConversationSchema.index({ botId: 1, sessionId: 1 }, { unique: true });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);