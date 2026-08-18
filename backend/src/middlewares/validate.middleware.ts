import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Factory middleware that validates req.body against a Zod schema.
 * Returns 400 with structured error messages if validation fails.
 *
 * Usage: router.post('/register', validate(registerSchema), register)
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
                return res.status(400).json({
                    error: 'Validation failed.',
                    details: messages
                });
            }
            return res.status(400).json({ error: 'Invalid request body.' });
        }
    };
};
