import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBot extends Document {
    tenantId: Types.ObjectId;
    
}