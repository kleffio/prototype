import { Router } from 'express';
import { openAIService } from '../services/openai.service.js';
import { vectorDBService } from '../services/vectordb.service.js';
import { embeddingsService } from '../services/embeddings.service.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { SUGGESTED_QUESTIONS } from '../config/prompts.js';

const router = Router();

// Get suggested questions
router.get('/suggested-questions', (req, res) => {
    res.json(SUGGESTED_QUESTIONS);
});

// Chat endpoint
router.post('/message', chatLimiter, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        // 1. Generate embedding for user query
        const embedding = await openAIService.generateEmbedding(message);

        // 2. Retrieve relevant docs from Pinecone
        const similarDocs = await vectorDBService.querySimilarDocuments(embedding);

        // Security: Filter out low-relevance matches. 
        // Debugging: Log the best score to help tune the threshold.
        const bestScore = similarDocs.length > 0 ? similarDocs[0].score : 0;
        console.log(`Query: "${message}" | Best Score: ${bestScore}`);

        // Threshold lowered to 0.65 based on user feedback.
        const relevantDocs = similarDocs.filter(doc => doc.score && doc.score > 0.65);

        if (relevantDocs.length === 0) {
            console.log('Request rejected due to low relevance score.');
            // No relevant documentation found. Refuse to answer.
            res.json({
                message: "I'm sorry, but I can only answer questions related to the Kleff platform, deployment, and pricing. I don't have information on that topic.",
                sources: []
            });
            return;
        }

        // 3. Construct context string
        const context = relevantDocs
            .map(doc => `[Source: ${doc.source}]\n${doc.text}`)
            .join('\n\n');

        // 4. Generate response with OpenAI
        const response = await openAIService.generateResponse(message, context);

        res.json({
            message: response,
            sources: similarDocs.map(doc => ({ source: doc.source, score: doc.score }))
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// Admin endpoint to index docs (protected in production)
router.post('/index-docs', async (req, res) => {
    try {
        const { text, metadata } = req.body;
        if (!text || !metadata) {
            res.status(400).json({ error: 'Text and metadata required' });
            return;
        }

        const chunkCount = await embeddingsService.indexDocument(text, metadata);
        res.json({ success: true, chunksProcessed: chunkCount });

    } catch (error) {
        console.error('Indexing error:', error);
        res.status(500).json({ error: 'Indexing failed' });
    }
});

export default router;
