import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in the environment variables.');
        }

        console.log('[MongoDB]: Attempting connection...');

        const conn = await mongoose.connect(mongoURI);

        console.log(`[MongoDB]: Connected successfully to cluster: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB]: Connection failed.`);
        if (error instanceof Error) {
            console.error(`Reason: ${error.message}`);
        }
        process.exit(1);
    }
};