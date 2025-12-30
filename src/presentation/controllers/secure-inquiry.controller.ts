import { NextFunction, Request, Response } from "express";
import { simulateAICall } from "../../application/secure-inquiry/infraestructure/services/simulate-aI-call";
import { CircuitBreaker } from "@/application/shared/infra/services/circuit-breaker";
import { PersistFileDB } from "@/application/secure-inquiry/infraestructure/persist-file/persist-file.db";

export const secureInquiryController = async (req: Request, res: Response, next: NextFunction) => {

    // Only accept JSON
    if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }

    // get data from body
    const { redactedContent, originalContent } = req.body;
    const { userId, message } = redactedContent;

    // Validate input
    if (typeof userId !== 'string' || typeof message !== 'string' || !userId.trim() || !message.trim()) {
        return res.status(400).json({ error: 'Invalid input. userId and message are required strings.' });
    }

    try {
        // Simulate external AI call (using the message as the redacted message for now)
        const circuitBreakerRes = await CircuitBreaker.execute(
            () => simulateAICall(message),
            "Service Busy"
        );

        // Handle Circuit Breaker response
        const aiResponse = circuitBreakerRes.result;

        // create log 
        PersistFileDB.saveLogEntry({
            'redacted-content': redactedContent,
            'original-content': originalContent,
            'ai-response': aiResponse
        })

        if (circuitBreakerRes.status === 'OPEN') {
            return res.status(503).json({ error: aiResponse });
        }

        return res.status(201).json({ status: 'success', received: { userId, message }, aiResponse: aiResponse });

    } catch (error) {

        const errorMsg = error instanceof Error ? error.message : 'Failed the request.';

        // create log 
        PersistFileDB.saveLogEntry({
            'redacted-content': redactedContent,
            'original-content': originalContent,
            'ai-response': errorMsg
        })

        return res.status(500).json({ error: 'Failed the request.' });
    }

    // Here you would handle the inquiry, e.g., save to DB, queue, etc.

}