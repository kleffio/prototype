import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { embeddingsService } from '../../services/embeddings.service.js';
import { openAIService } from '../../services/openai.service.js';
import { vectorDBService } from '../../services/vectordb.service.js';

// Mock dependencies
jest.mock('../../services/openai.service.js', () => ({
    openAIService: {
        generateEmbedding: jest.fn()
    }
}));

jest.mock('../../services/vectordb.service.js', () => ({
    vectorDBService: {
        upsertVectors: jest.fn()
    }
}));

describe('EmbeddingsService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('indexDocument', () => {
        it('should chunk text, generate embeddings, and upsert vectors', async () => {
            const text = "Sentence one. Sentence two. Sentence three.";
            const metadata = { source: '/test', title: 'Test', category: 'General' };
            const mockEmbedding = [0.1, 0.2, 0.3];

            (openAIService.generateEmbedding as any).mockResolvedValue(mockEmbedding);
            (vectorDBService.upsertVectors as any).mockResolvedValue(undefined);

            const chunkCount = await embeddingsService.indexDocument(text, metadata);

            expect(chunkCount).toBeGreaterThan(0);
            expect(openAIService.generateEmbedding).toHaveBeenCalled();
            expect(vectorDBService.upsertVectors).toHaveBeenCalled();
        });

        it('should handle batching correctly (mocking with large text simulation)', async () => {
            const longText = "Sentence 1. ".repeat(100);
            (openAIService.generateEmbedding as any).mockResolvedValue([0.1]);

            await embeddingsService.indexDocument(longText, { source: 's', title: 't', category: 'c' });

            // Just verify it was called. 
            // With 1200 characters and 1000 limit, it should be 2 chunks.
            expect(openAIService.generateEmbedding).toHaveBeenCalledTimes(2);
            expect(vectorDBService.upsertVectors).toHaveBeenCalled();
        });
    });
});
