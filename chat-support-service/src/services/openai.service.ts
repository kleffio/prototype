import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '../config/prompts.js';

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async generateResponse(userMessage: string, context: string): Promise<string> {
        if (process.env.USE_MOCK_AI === 'true') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return "This is a mock response (Mock Mode Enabled). I received: \"" + userMessage + "\". Functionality is limited without a valid API key.";
        }

        try {
            const systemMessage = SYSTEM_PROMPT.replace('{{context}}', context);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo', // Cost-effective model
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5, // Lower temperature for more factual responses
                max_tokens: 500,
            });

            return response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response at this time.";
        } catch (error) {
            console.error('Error generating OpenAI response:', error);
            throw new Error('Failed to generate response from AI provider.');
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        if (process.env.USE_MOCK_AI === 'true') {
            // Return random embedding
            return Array(1536).fill(0).map(() => Math.random());
        }

        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text.replace(/\n/g, ' '),
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding.');
        }
    }
}

export const openAIService = new OpenAIService();
