import mongoose from "mongoose";
import logger from "./logger.js";

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error('MONGO_URI is not defined in the environment variables.');
        }

        logger.info('[MongoDB]: Attempting connection...');

        const conn = await mongoose.connect(mongoURI, {
            maxPoolSize: 20,       // Handle concurrent AI workloads (default is 5 — too low)
            serverSelectionTimeoutMS: 10000, // Fail fast if Atlas is unreachable
            socketTimeoutMS: 45000,          // Allow long-running aggregations
        });

        logger.info(`[MongoDB]: Connected to cluster: ${conn.connection.host}`);
    } catch (error) {
        logger.error('[MongoDB]: Connection failed.');
        if (error instanceof Error) {
            logger.error(`Reason: ${error.message}`);
        }
        process.exit(1);
    }
};