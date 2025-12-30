import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to redact sensitive information (emails, credit cards, SSNs) from request bodies.
 * Replaces matches with <REDACTED: [emails | credit cards | SSNs]>.
 * Ensures scalability, consistency, and security.
 */
export function redactSensitiveData(req: Request, res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
        req.body = deepRedact(req.body);
    }
    next();
}

function deepRedact(obj: any): any {

    if (Array.isArray(obj)) {
        return obj.map(item => deepRedact(item));
    }

    if (obj !== null && typeof obj === 'object') {
        // Avoid prototype pollution
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = deepRedact(value);
        }
        return result;
    }

    if (typeof obj === 'string') {
        return redactString(obj);
    }
    return obj;
}

function redactString(str: string): string {
    // Email regex
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Credit card regex (simple, 13-19 digits, with optional spaces/dashes)
    const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    // SSN regex (9 digits, with or without dashes)
    const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;

    let redacted = str.replace(emailRegex, '<REDACTED: emails>');
    redacted = redacted.replace(ccRegex, '<REDACTED: credit cards>');
    redacted = redacted.replace(ssnRegex, '<REDACTED: SSNs>');
    return redacted;
}
