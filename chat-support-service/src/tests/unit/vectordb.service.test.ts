import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Pinecone } from '@pinecone-database/pinecone';

// Mock Pinecone
const mockQuery = jest.fn() as any;
const mockUpsert = jest.fn() as any;
const mockDescribeIndexStats = (jest.fn() as any).mockResolvedValue({ totalRecordCount: 10 });
const mockDeleteAll = jest.fn() as any;

const mockIndex = jest.fn(() => ({
    query: mockQuery,
    upsert: mockUpsert,
    describeIndexStats: mockDescribeIndexStats,
    deleteAll: mockDeleteAll
}));

jest.mock('@pinecone-database/pinecone', () => {
    return {
        Pinecone: jest.fn().mockImplementation(() => ({
            Index: mockIndex
        }))
    };
});

// Import service
import { vectorDBService, VectorDBService } from '../../services/vectordb.service.js';

describe('VectorDBService', () => {

    describe('Constructor', () => {
        it('should use default values if env vars are missing', () => {
            const originalApiKey = process.env.PINECONE_API_KEY;
            const originalIndexName = process.env.PINECONE_INDEX_NAME;

            delete process.env.PINECONE_API_KEY;
            delete process.env.PINECONE_INDEX_NAME;

            new VectorDBService();

            expect(Pinecone).toHaveBeenCalledWith({ apiKey: '' });

            // Restore env
            process.env.PINECONE_API_KEY = originalApiKey;
            process.env.PINECONE_INDEX_NAME = originalIndexName;
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('querySimilarDocuments', () => {
        it('should query Pinecone Index', async () => {
            mockQuery.mockResolvedValue({
                matches: [
                    { score: 0.9, id: '1', metadata: { text: 'T1', source: 'S1' } }
                ]
            });

            const results = await vectorDBService.querySimilarDocuments([0.1, 0.2]);

            expect(mockIndex).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalled();
            expect(results).toHaveLength(1);
            expect(results[0].text).toBe('T1');
        });

        it('should handle empty results or errors', async () => {
            mockQuery.mockRejectedValue(new Error('Pinecone Error'));
            const results = await vectorDBService.querySimilarDocuments([0.1]);
            expect(results).toEqual([]); // Service swallows error and returns empty array
        });
    });

    describe('upsertVectors', () => {
        it('should upsert vectors to Pinecone', async () => {
            const vectors = [{ id: '1', values: [0.1], metadata: { text: 't' } }];
            mockUpsert.mockResolvedValue(undefined);

            await vectorDBService.upsertVectors(vectors);

            expect(mockIndex).toHaveBeenCalled();
            expect(mockUpsert).toHaveBeenCalledWith(vectors);
        });

        it('should handle upsert errors', async () => {
            mockUpsert.mockRejectedValue(new Error('Upsert Failed'));
            await expect(vectorDBService.upsertVectors([])).rejects.toThrow('Upsert Failed');
        });
    });

    describe('deleteAll', () => {
        it('should call deleteAll on index', async () => {
            await vectorDBService.deleteAll();
            expect(mockDeleteAll).toHaveBeenCalled();
        });

        it('should handle deleteAll errors', async () => {
            mockDeleteAll.mockRejectedValue(new Error('Delete Failed'));
            await vectorDBService.deleteAll(); // Should not throw
            // Verify console.error? We can assume coverage is hit.
        });
    });

    describe('checkStats', () => {
        it('should return stats', async () => {
            const stats = await vectorDBService.checkStats();
            expect(stats).toBeTruthy();
            expect(mockDescribeIndexStats).toHaveBeenCalled();
        });

        it('should handle checkStats errors', async () => {
            mockDescribeIndexStats.mockRejectedValue(new Error('Stats Failed'));
            const stats = await vectorDBService.checkStats();
            expect(stats).toBeNull();
        });
    });

});
