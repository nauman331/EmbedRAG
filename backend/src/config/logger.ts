import { createLogger, format, transports } from 'winston';

const { combine, timestamp, colorize, printf, json, errors } = format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

/**
 * Structured logger with environment-aware output:
 * - Development: colorized, human-readable
 * - Production: JSON lines (compatible with Datadog, CloudWatch, Loki, etc.)
 */
const logger = createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
    ),
    transports: [
        new transports.Console()
    ],
    exitOnError: false
});

export default logger;
