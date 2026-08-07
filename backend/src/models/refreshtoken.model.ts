import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
}

const RefreshTokenSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }
        },
        revoked: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);