import { embeddingsService } from '../services/embeddings.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample docs for initial seeding
const DOCTEST_DATA = [
  // --- Pricing ---
  {
    title: "Pricing Model",
    url: "/pricing",
    category: "billing",
    content: `
      Kleff Pricing is Pay-As-You-Go with no hidden fees.
      
      Free Tier:
      - 100GB bandwidth/month
      - 1GB persistent storage
      - Unlimited preview deployments
      - Community support
      
      Paid Usage:
      - CPU Usage: Per vCPU hour
      - RAM Usage: Per GB hour
      - Storage: Per GB per month
      
      Features:
      - Cancel anytime, no penalties.
      - Billing prorated to the second.
      - Accepts Visa, Mastercard, Amex, PayPal.
      - Discounts for startups and students available.
    `
  },

  // --- Status & Support ---
  {
    title: "System Status & SLA",
    url: "/status",
    category: "support",
    content: `
      Kleff guarantees 99.9% uptime for production deployments.
      
      Infrastructure:
      - Hosted in Canada (Toronto, Montreal, Vancouver).
      - Multi-zone failover.
      - Real-time status page at '/status'.
      
      Troubleshooting:
      - Check '/status' for outages.
      - Verify Prometheus metrics if enabled.
      - Check specific node uptime.
    `
  },

  // --- About Us ---
  {
    title: "About Kleff",
    url: "/about",
    category: "company",
    content: `
      Kleff is a Canadian PaaS built for developers.
      
      Mission: Make enterprise-grade cloud hosting accessible with transparent pricing and developer-first tools.
      
      Key Features:
      - 100% Canadian Data Sovereignty (PIPEDA compliant).
      - Transparent Pricing.
      - Built on Kubernetes, Docker, Helm.
      - Tech Stack: Go, Java Spring Boot, React, PostgreSQL, Redis.
      
      "Built by developers, for developers, with a focus on simplicity."
    `
  },

  // --- Legal & Privacy ---
  {
    title: "Terms of Service",
    url: "/terms",
    category: "legal",
    content: `
      Core Principles:
      1. Use it right: No malware, spam, crypto mining, or illegal content.
      2. Pay fair: Only pay for what you use.
      3. Own your data: Export anytime.
      
      SLA: 99.9% Uptime.
      Security: DDoS protection, automated backups (30 days retention).
    `
  },
  {
    title: "Privacy Policy",
    url: "/privacy",
    category: "legal",
    content: `
      Your Privacy is Sacred.
      
      - Data Location: 100% Canadian. Never leaves Canada.
      - Compliance: PIPEDA and Bill C-11.
      - Encryption: AES-256 at rest, TLS 1.3 in transit.
      - Data Collection: Contact info, Billing data (processed via Stripe), Usage stats (anonymous).
      - Rights: Access, Delete, Export, Correct your data anytime.
    `
  },

  // --- FAQs (Derived from FAQ Page) ---
  {
    title: "FAQ - Getting Started & Tech",
    url: "/faq",
    category: "support",
    content: `
      Q: What is Kleff?
      A: Open-source hosting, deploy from Git, Kubernetes-based, Canadian.
      
      Q: Do I need DevOps experience?
      A: No. We handle orchestration, scaling, networking.
      
      Q: Can I self-host?
      A: Yes, Kleff is open-source.
      
      Q: Where are servers located?
      A: Canada (Toronto, Montreal, Vancouver).
    `
  },
  {
    title: "FAQ - Security & Infrastructure",
    url: "/faq",
    category: "security",
    content: `
      Q: How secure is Kleff?
      A: Enterprise-grade. auto-SSL, DDoS protection, encrypted secrets.
      
      Q: Do you support custom domains?
      A: Yes, unlimited custom domains with auto-SSL.
      
      Q: How do you handle secrets?
      A: Encrypted management, injected at runtime.
      
      Q: Do you have a status page?
      A: Yes, at '/status'.
    `
  }
];

async function run() {
  console.log('Starting documentation indexing...');

  if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
    console.error('Missing API keys. Check .env');
    process.exit(1);
  }

  let totalChunks = 0;

  // Clear old data first!
  console.log('Clearing old index data...');

  // Clear existing vector index before seeding new documents
  const { vectorDBService } = await import('../services/vectordb.service.js');
  await vectorDBService.deleteAll();

  for (const doc of DOCTEST_DATA) {
    console.log(`Indexing ${doc.title}...`);
    try {
      const chunks = await embeddingsService.indexDocument(doc.content, {
        title: doc.title,
        source: doc.url,
        category: doc.category
      });
      totalChunks += chunks;
      console.log(`Indexed ${doc.title} (${chunks} chunks)`);
    } catch (error) {
      console.error(`Failed to index ${doc.title}:`, error);
    }
  }

  console.log(`\nIndexing complete! Processed ${totalChunks} chunks.`);
}

run();
