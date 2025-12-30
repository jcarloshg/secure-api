import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { secureInquiryController } from './presentation/controllers/secure-inquiry.controller';

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' })); // Only accept JSON, limit body size

const PORT = process.env.PORT || 3000;


app.get('/', (req: Request, res: Response) => {
    res.send('Hello, Secure API is running!');
});

// POST /secure-inquiry endpoint
app.post('/secure-inquiry', secureInquiryController);


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;