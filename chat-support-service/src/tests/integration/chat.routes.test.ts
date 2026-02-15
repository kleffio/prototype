import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock imports MUST be before other imports? 
// Actually jest.mock is hoisted, but let's be explicit.

jest.mock('../../services/openai.service.js', () => ({
    openAIService: {
        generateEmbedding: jest.fn(),
        generateResponse: jest.fn()
    }
}));

jest.mock('../../services/vectordb.service.js', () => ({
    vectorDBService: {
        querySimilarDocuments: jest.fn(),
        upsertVectors: jest.fn(),
        checkStats: jest.fn()
    }
}));

jest.mock('../../services/embeddings.service.js', () => ({
    embeddingsService: {
        indexDocument: jest.fn()
    }
}));

import request from 'supertest';
import app from '../../app.js';
// Import dependencies to control mocks
import { openAIService } from '../../services/openai.service.js';
import { vectorDBService } from '../../services/vectordb.service.js';
import { embeddingsService } from '../../services/embeddings.service.js';

// No need to re-import mocked services inside tests if we import them here.

// Mocks are defined at the top.

describe('Chat Routes Integration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/chat/suggested-questions', () => {
        it('should return a list of suggested questions', async () => {
            const res = await request(app).get('/api/v1/chat/suggested-questions');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('text');
        });
    });

    describe('POST /api/v1/chat/message', () => {
        it('should return 400 if message is missing', async () => {
            const res = await request(app).post('/api/v1/chat/message').send({});
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        it('should handle a valid chat flow', async () => {
            // Setup Mocks
            const mockEmbedding = [0.1, 0.2, 0.3];
            (openAIService.generateEmbedding as any).mockResolvedValue(mockEmbedding);

            const mockDocs = [
                { score: 0.8, text: 'Context 1', source: '/pricing', id: '1' },
                { score: 0.7, text: 'Context 2', source: '/about', id: '2' }
            ];
            (vectorDBService.querySimilarDocuments as any).mockResolvedValue(mockDocs);

            (openAIService.generateResponse as any).mockResolvedValue('This is an AI response.');

            // Execute
            const res = await request(app)
                .post('/api/v1/chat/message')
                .send({ message: 'How much does it cost?' });

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'This is an AI response.');
            expect(res.body).toHaveProperty('sources');
            expect(res.body.sources).toHaveLength(2);
            expect(res.body.sources[0]).toEqual({ source: '/pricing', score: 0.8 });

            // Verify service calls
            expect(openAIService.generateEmbedding).toHaveBeenCalledWith('How much does it cost?');
            expect(vectorDBService.querySimilarDocuments).toHaveBeenCalledWith(mockEmbedding);
            expect(openAIService.generateResponse).toHaveBeenCalled();
        });

        it('should handle "I don\'t know" case (Low Relevance)', async () => {
            (openAIService.generateEmbedding as any).mockResolvedValue([0.1]);
            // Return low score docs
            (vectorDBService.querySimilarDocuments as any).mockResolvedValue([
                { score: 0.4, text: 'Irrelevant', source: '/random', id: '1' }
            ]);

            const res = await request(app)
                .post('/api/v1/chat/message')
                .send({ message: 'How to bake a cake?' });

            expect(res.status).toBe(200);
            // Should contain refusal message
            expect(res.body.message).toMatch(/I'm sorry/);
            expect(res.body.sources).toEqual([]);
            // Should NOT call OpenAI generateResponse
            expect(openAIService.generateResponse).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            (openAIService.generateEmbedding as any).mockRejectedValue(new Error('OpenAI Down'));

            const res = await request(app)
                .post('/api/v1/chat/message')
                .send({ message: 'Hello' });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'healthy');
        });
    });
    describe('POST /api/v1/chat/index-docs', () => {
        // embeddingsService is imported at top

        it('should index documentation successfully', async () => {
            (embeddingsService.indexDocument as any).mockResolvedValue(5);

            const res = await request(app)
                .post('/api/v1/chat/index-docs')
                .send({
                    text: 'Some doc text',
                    metadata: { source: '/doc', title: 'Doc', category: 'Cat' }
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('chunksProcessed', 5);
            expect(embeddingsService.indexDocument).toHaveBeenCalled();
        });

        it('should validation error if missing fields', async () => {
            const res = await request(app)
                .post('/api/v1/chat/index-docs')
                .send({});

            expect(res.status).toBe(400);
        });
    });
});
