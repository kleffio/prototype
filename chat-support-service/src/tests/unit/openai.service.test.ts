import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the OpenAI class constructor
const mockCompletionsCreate = jest.fn() as any;
const mockEmbeddingsCreate = jest.fn() as any;

jest.mock('openai', () => {
    const mockConstructor = jest.fn().mockImplementation(() => {
        return {
            chat: { completions: { create: mockCompletionsCreate } },
            embeddings: { create: mockEmbeddingsCreate }
        };
    });
    return {
        __esModule: true,
        default: mockConstructor,
        OpenAI: mockConstructor
    };
});

// Import service AFTER mocking
import { openAIService } from '../../services/openai.service.js';

describe('OpenAIService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset ENV
        process.env.USE_MOCK_AI = 'false';
    });

    describe('generateResponse', () => {
        it('should call OpenAI API and return content', async () => {
            mockCompletionsCreate.mockResolvedValue({
                choices: [{ message: { content: 'AI Response' } }]
            });

            const response = await openAIService.generateResponse('Hello', 'Context');
            expect(response).toBe('AI Response');
            expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: expect.arrayContaining([{ role: 'user', content: 'Hello' }])
            }));
        });

        it('should use Mock AI if env var is set', async () => {
            process.env.USE_MOCK_AI = 'true';
            const response = await openAIService.generateResponse('Test', 'Ctx');
            expect(response).toContain('Mock Mode');
            expect(mockCompletionsCreate).not.toHaveBeenCalled();
        });

        it('should handle API errors', async () => {
            mockCompletionsCreate.mockRejectedValue(new Error('API Error'));
            await expect(openAIService.generateResponse('Hello', 'Ctx'))
                .rejects.toThrow('Failed to generate response from AI provider.');
        });
        it('should return default message if API returns no content', async () => {
            mockCompletionsCreate.mockResolvedValue({
                choices: []
            });
            const response = await openAIService.generateResponse('Hello', 'Ctx');
            expect(response).toBe("I apologize, but I couldn't generate a response at this time.");
        });
    });

    describe('generateEmbedding', () => {
        it('should call OpenAI Embeddings API', async () => {
            const mockVector = [0.1, 0.2];
            mockEmbeddingsCreate.mockResolvedValue({
                data: [{ embedding: mockVector }]
            });

            const result = await openAIService.generateEmbedding('text');
            expect(result).toEqual(mockVector);
            expect(mockEmbeddingsCreate).toHaveBeenCalled();
        });

        it('should return random mock embedding if env var is set', async () => {
            process.env.USE_MOCK_AI = 'true';
            const result = await openAIService.generateEmbedding('text');
            expect(result).toHaveLength(1536);
            expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
        });
        it('should handle API errors', async () => {
            mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));
            await expect(openAIService.generateEmbedding('text')).rejects.toThrow('Failed to generate embedding.');
        });
    });
});
