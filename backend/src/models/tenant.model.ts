import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
    email: string;
    companyName: string;
    subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE';
    createdAt: Date;
    updatedAt: Date;
}

const TenantSchema: Schema = new Schema<ITenant>({
    email: { type: String, required: true, unique: true, lowercase: true },
    companyName: { type: String, required: true },
    subscriptionTier: { type: String, enum: ['FREE', 'PRO', 'ENTERPRISE'], default: 'FREE' },
}, {
    timestamps: true,
})

export default mongoose.model<ITenant>('Tenant', TenantSchema);
