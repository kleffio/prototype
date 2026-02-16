import { openAIService } from './openai.service.js';
import { vectorDBService } from './vectordb.service.js';
import { v4 as uuidv4 } from 'uuid';

export class EmbeddingsService {

    async indexDocument(text: string, metadata: { source: string; title: string; category: string }) {
        // 1. Chunk the text
        const chunks = this.chunkText(text, 1000); // ~1000 chars per chunk

        console.log(`Processing ${chunks.length} chunks for ${metadata.title}...`);

        const vectors = [];

        // 2. Generate embeddings for each chunk
        for (const chunk of chunks) {
            const embedding = await openAIService.generateEmbedding(chunk);

            vectors.push({
                id: uuidv4(),
                values: embedding,
                metadata: {
                    ...metadata,
                    text: chunk
                }
            });
        }

        // 3. Upsert to Pinecone in batches
        const batchSize = 50;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await vectorDBService.upsertVectors(batch);
        }

        return chunks.length;
    }

    private chunkText(text: string, chunkSize: number): string[] {
        const chunks: string[] = [];
        let currentChunk = '';

        const sentences = text.replace(/([.?!])\s+(?=[A-Z])/g, "$1|").split("|");

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += sentence + ' ';
        }
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

export const embeddingsService = new EmbeddingsService();
