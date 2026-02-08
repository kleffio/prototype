import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8086;

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

