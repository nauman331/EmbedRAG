import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    tenantId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: 'Tenant',
            required: true,
            index: true,
        }
    },
    { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);