import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { secureInquiryController } from './presentation/controllers/secure-inquiry.controller';
import { redactSensitiveData } from './presentation/middlewares/redactSensitiveData.middleware';
const PORT = process.env.PORT || 3000;

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' })); // Only accept JSON, limit body size
// Apply redactSensitiveData middleware globally
app.use(redactSensitiveData);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, Secure API is running!');
});

// POST /secure-inquiry endpoint
app.post('/secure-inquiry', secureInquiryController);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// if (require.main === module) {
// }

export default app;