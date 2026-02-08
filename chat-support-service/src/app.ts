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
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Lock this down in production
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
