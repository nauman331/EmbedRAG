import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    deviceInfo: {
        userAgent: string;
        ipAddress: string;
        deviceType: string;
    };
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
        },
        deviceInfo: {
            userAgent: { type: String, default: 'Unknown' },
            ipAddress: { type: String, default: 'Unknown' },
            deviceType: { type: String, default: 'Unknown' }
        }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);