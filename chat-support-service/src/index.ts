import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.routes.js';

import { apiLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8086;

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

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`OpenAI API Key provided: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`Pinecone API Key provided: ${!!process.env.PINECONE_API_KEY}`);

    // Check Vector DB connection on startup
    import('./services/vectordb.service.js').then(({ vectorDBService }) => {
        vectorDBService.checkStats().then(stats => {
            if (stats && stats.totalRecordCount === 0) {
                console.warn('⚠️  WARNING: Pinecone Index is EMPTY. Run `npm run index-docs` to populate it.');
            } else if (stats) {
                console.log(`✅ Pinecone Connected. Total Vectors: ${stats.totalRecordCount}`);
            }
        });
    });
});
