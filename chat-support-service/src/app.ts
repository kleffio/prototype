import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.routes.js';
import { apiLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();

// Security & Middleware
app.use(helmet());
const corsOrigin = process.env.CORS_ORIGIN;

if (process.env.NODE_ENV === 'production') {
    if (!corsOrigin || corsOrigin === '*') {
        throw new Error('CORS_ORIGIN must be set to a specific origin in production.');
    }
}

app.use(cors({
    origin: corsOrigin || '*', // In production, this is guaranteed not to be '*'
    methods: ['GET', 'POST']
}));
app.use(express.json());

// Global Rate Limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/v1/chat', chatRoutes);


// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

export default app;
