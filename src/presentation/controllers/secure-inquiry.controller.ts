import { NextFunction, Request, Response } from "express";

export const secureInquiryController = (req: Request, res: Response, next: NextFunction) => {
    // Only accept JSON
    if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    const { userId, message } = req.body;
    // Validate input
    if (typeof userId !== 'string' || typeof message !== 'string' || !userId.trim() || !message.trim()) {
        return res.status(400).json({ error: 'Invalid input. userId and message are required strings.' });
    }
    // Here you would handle the inquiry, e.g., save to DB, queue, etc.
    // For now, just return success
    return res.status(201).json({ status: 'success', received: { userId, message } });
}