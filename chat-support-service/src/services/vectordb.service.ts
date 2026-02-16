import { Pinecone } from '@pinecone-database/pinecone';

export class VectorDBService {
    private pinecone: Pinecone;
    private indexName: string;

    constructor() {
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || '',
        });
        this.indexName = process.env.PINECONE_INDEX_NAME || 'kleff-docs';
    }

    async querySimilarDocuments(vector: number[], topK: number = 3) {
        try {
            const index = this.pinecone.Index(this.indexName);
            const queryResponse = await index.query({
                vector,
                topK,
                includeMetadata: true,
            });

            return queryResponse.matches.map(match => ({
                score: match.score,
                text: match.metadata?.text as string,
                source: match.metadata?.source as string,
                id: match.id
            }));
        } catch (error) {
            console.error('Error querying vector DB:', error);
            return [];
        }
    }

    async upsertVectors(vectors: any[]) {
        try {
            const index = this.pinecone.Index(this.indexName);
            await index.upsert(vectors);
        } catch (error) {
            console.error('Error upserting vectors:', error);
            throw error;
        }
    }

    async checkStats() {
        try {
            const index = this.pinecone.Index(this.indexName);
            const stats = await index.describeIndexStats();
            console.log('Pinecone Stats:', stats);
            return stats;
        } catch (error) {
            console.error('Error checking Pinecone stats:', error);
            return null;
        }
    }

    async deleteAll() {
        try {
            const index = this.pinecone.Index(this.indexName);
            await index.deleteAll();
            console.log('Deleted all vectors from index.');
        } catch (error) {
            console.error('Error deleting vectors:', error);
        }
    }
}

export const vectorDBService = new VectorDBService();
