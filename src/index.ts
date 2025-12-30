import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' })); // Only accept JSON, limit body size

const PORT = process.env.PORT || 3000;


app.get('/', (req: Request, res: Response) => {
    res.send('Hello, Secure API is running!');
});

// POST /secure-inquiry endpoint
app.post('/secure-inquiry', (req: Request, res: Response, next: NextFunction) => {
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
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;