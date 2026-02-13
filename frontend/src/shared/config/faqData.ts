import type { LucideIcon } from "lucide-react";
import { DollarSign, Lock, Rocket, Shield, Users, Zap } from "lucide-react";
import type { Locale } from "@app/locales/locale";

export interface FAQQuestion {
  q: string;
  a: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  questions: FAQQuestion[];
}

const enData: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    questions: [
      {
        q: "What is Kleff?",
        a: "Kleff is an open-source hosting platform that lets you deploy applications directly from Git with zero configuration. Built on Kubernetes with Canadian infrastructure, we offer Vercel-level developer experience without vendor lock-in."
      },
      {
        q: "How do I deploy my first application?",
        a: "Connect your GitHub, GitLab, or Bitbucket repository, select your project, and push your code. Kleff automatically detects your framework, builds your application, and deploys it—usually in under 60 seconds."
      },
      {
        q: "Which frameworks and languages does Kleff support?",
        a: "We support all major frameworks: React, Next.js, Vue, Nuxt, Angular, Svelte, Node.js, Python (Django, Flask, FastAPI), Ruby on Rails, PHP (Laravel), Go, Rust, and more. If it runs in a container, it runs on Kleff."
      },
      {
        q: "Do I need DevOps experience to use Kleff?",
        a: "No. Kleff is designed for developers, not DevOps engineers. We handle containerization, orchestration, scaling, networking, and monitoring—you just write code."
      },
      {
        q: "Can I run Kleff on my own infrastructure?",
        a: "Yes! Kleff is open-source and self-hostable. Deploy it on your own servers, on-premises hardware, or any cloud provider. The same workflow works everywhere."
      },
      {
        q: "How do preview deployments work?",
        a: "Every pull request gets its own preview URL automatically. Share it with your team to review changes before merging. Preview environments are ephemeral and destroyed when the PR is closed."
      }
    ]
  },
  {
    id: "pricing",
    title: "Pricing & Billing",
    icon: DollarSign,
    questions: [
      {
        q: "How does Kleff's pricing work?",
        a: "Pay only for what you use with transparent, usage-based billing. We charge for compute time, bandwidth, and storage—no hidden fees, no surprise charges. Free tier available for hobby projects."
      },
      {
        q: "What's included in the free tier?",
        a: "The free tier includes: 100GB bandwidth/month, 1GB persistent storage, unlimited preview deployments, automatic SSL, and community support. Perfect for personal projects and testing."
      },
      {
        q: "Can I change plans anytime?",
        a: "Yes. Upgrade or downgrade instantly with no penalties. Billing is prorated automatically, so you only pay for what you use."
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and can arrange invoicing for enterprise customers. All transactions are in Canadian dollars (CAD)."
      },
      {
        q: "Do you offer discounts for startups or students?",
        a: "Yes! We offer special pricing for YC-backed startups, GitHub Student Pack members, and early-stage companies. Contact us to learn more."
      },
      {
        q: "What happens if I exceed my plan limits?",
        a: "We'll notify you before you hit any limits. You can upgrade instantly or we'll throttle gracefully without taking your apps offline."
      }
    ]
  },
  {
    id: "performance",
    title: "Infrastructure & Performance",
    icon: Zap,
    questions: [
      {
        q: "Where are Kleff's servers located?",
        a: "All infrastructure is hosted in Canada (Toronto, Montreal, Vancouver) ensuring compliance with Canadian data protection laws and providing low-latency access for North American users."
      },
      {
        q: "What's your uptime SLA?",
        a: "We guarantee 99.9% uptime for production deployments with automated failover across multiple availability zones. Enterprise plans include 99.99% SLA."
      },
      {
        q: "How fast are deployments?",
        a: "Most applications deploy in under 60 seconds. We use smart caching and incremental builds—subsequent deployments are even faster, often under 30 seconds."
      },
      {
        q: "Does auto-scaling work automatically?",
        a: "Yes. Your applications scale horizontally based on traffic automatically. Set minimum and maximum instances, and Kleff handles the rest—including scaling down to zero for idle apps."
      },
      {
        q: "What about database scaling?",
        a: "Managed databases (PostgreSQL, MySQL, MongoDB) scale automatically with read replicas and connection pooling. You can also bring your own database."
      },
      {
        q: "How do you handle traffic spikes?",
        a: "Built-in auto-scaling responds to traffic in seconds. We also offer DDoS protection and rate limiting to keep your apps stable under any load."
      }
    ]
  },
  {
    id: "security",
    title: "Security & Compliance",
    icon: Shield,
    questions: [
      {
        q: "How secure is Kleff?",
        a: "Enterprise-grade security: automatic SSL certificates, DDoS protection, encrypted data at rest and in transit, secrets management, regular security audits, and SOC 2 compliance in progress."
      },
      {
        q: "Does Kleff comply with Canadian privacy laws?",
        a: "Yes. As a Canadian company with Canadian infrastructure, we fully comply with PIPEDA and Bill C-11. Your data stays in Canada and follows Canadian privacy regulations."
      },
      {
        q: "How do SSL certificates work?",
        a: "Automatic SSL provisioning and renewal for all domains via Let's Encrypt. Custom SSL certificates are supported for enterprise plans. All traffic is encrypted by default."
      },
      {
        q: "Can I use my own domain?",
        a: "Absolutely. Connect unlimited custom domains with automatic SSL. Supports apex domains, subdomains, and wildcard domains."
      },
      {
        q: "How do you handle secrets and environment variables?",
        a: "Encrypted secrets management with automatic rotation. Environment variables are encrypted at rest and only decrypted at runtime in isolated containers."
      },
      {
        q: "What compliance certifications do you have?",
        a: "We're working toward SOC 2 Type II certification. We're already PIPEDA compliant and follow OWASP security best practices."
      }
    ]
  },
  {
    id: "support",
    title: "Support & Resources",
    icon: Users,
    questions: [
      {
        q: "What support options are available?",
        a: "Free tier gets community support (Discord, forums). Paid plans include email support with <24h response times. Enterprise customers get dedicated Slack channels and phone support."
      },
      {
        q: "Is there documentation available?",
        a: "Comprehensive documentation covering quickstart guides, API references, deployment tutorials, troubleshooting, and best practices. Plus video tutorials and example projects."
      },
      {
        q: "Do you offer migration assistance?",
        a: "Yes! Enterprise plans include free migration assistance from Vercel, Netlify, Heroku, or any other platform. We'll help you move your apps with zero downtime."
      },
      {
        q: "Can I get help optimizing my deployments?",
        a: "Absolutely. Enterprise customers get performance audits and optimization recommendations. We'll help you reduce costs and improve speed."
      },
      {
        q: "What's your API documentation like?",
        a: "Full REST API and GraphQL API with comprehensive docs, SDKs for popular languages (Node.js, Python, Go, Ruby), and OpenAPI specs for code generation."
      },
      {
        q: "Do you have a status page?",
        a: "Yes. Real-time status page showing uptime, latency, and any incidents across all regions. Subscribe to get notifications for outages."
      }
    ]
  },
  {
    id: "technical",
    title: "Technical Details",
    icon: Lock,
    questions: [
      {
        q: "What container runtime do you use?",
        a: "We use containerd on Kubernetes for maximum compatibility and security. All images are scanned for vulnerabilities before deployment."
      },
      {
        q: "Can I use Docker Compose?",
        a: "Yes. Import your existing docker-compose.yml files directly. We'll convert them to Kubernetes deployments automatically while preserving your configuration."
      },
      {
        q: "Do you support WebSockets?",
        a: "Full WebSocket support with automatic connection draining during deployments for zero-downtime updates."
      },
      {
        q: "What about cron jobs and background workers?",
        a: "Schedule cron jobs directly in your dashboard or via API. Background workers scale independently from your web processes."
      },
      {
        q: "Can I access deployment logs in real-time?",
        a: "Yes. Stream logs in real-time via dashboard or CLI. Logs are retained for 30 days on paid plans, 7 days on free tier."
      },
      {
        q: "Do you support CI/CD integrations?",
        a: "Native GitHub Actions, GitLab CI, and CircleCI integrations. Also supports webhooks for custom CI/CD pipelines."
      }
    ]
  }
];

const frData: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Démarrage",
    icon: Rocket,
    questions: [
      {
        q: "Qu'est-ce que Kleff ?",
        a: "Kleff est une plateforme d'hébergement open source qui vous permet de déployer des applications directement depuis Git sans configuration. Construite sur Kubernetes avec une infrastructure canadienne, nous offrons une expérience développeur de niveau Vercel sans verrouillage fournisseur."
      },
      {
        q: "Comment déployer ma première application ?",
        a: "Connectez votre dépôt GitHub, GitLab ou Bitbucket, sélectionnez votre projet et poussez votre code. Kleff détecte automatiquement votre framework, compile votre application et la déploie — généralement en moins de 60 secondes."
      },
      {
        q: "Quels frameworks et langages Kleff supporte-t-il ?",
        a: "Nous supportons tous les principaux frameworks : React, Next.js, Vue, Nuxt, Angular, Svelte, Node.js, Python (Django, Flask, FastAPI), Ruby on Rails, PHP (Laravel), Go, Rust et plus encore. Si ça tourne dans un conteneur, ça tourne sur Kleff."
      },
      {
        q: "Ai-je besoin d'expérience DevOps pour utiliser Kleff ?",
        a: "Non. Kleff est conçu pour les développeurs, pas pour les ingénieurs DevOps. Nous gérons la conteneurisation, l'orchestration, la mise à l'échelle, le réseau et la surveillance — vous écrivez simplement du code."
      },
      {
        q: "Puis-je exécuter Kleff sur ma propre infrastructure ?",
        a: "Oui ! Kleff est open source et auto-hébergeable. Déployez-le sur vos propres serveurs, votre matériel sur site ou n'importe quel fournisseur cloud. Le même workflow fonctionne partout."
      },
      {
        q: "Comment fonctionnent les déploiements de prévisualisation ?",
        a: "Chaque pull request obtient automatiquement sa propre URL de prévisualisation. Partagez-la avec votre équipe pour examiner les changements avant de fusionner. Les environnements de prévisualisation sont éphémères et détruits lorsque la PR est fermée."
      }
    ]
  },
  {
    id: "pricing",
    title: "Tarification et facturation",
    icon: DollarSign,
    questions: [
      {
        q: "Comment fonctionne la tarification de Kleff ?",
        a: "Payez uniquement ce que vous utilisez avec une facturation transparente basée sur l'usage. Nous facturons le temps de calcul, la bande passante et le stockage — pas de frais cachés, pas de surprises. Plan gratuit disponible pour les projets personnels."
      },
      {
        q: "Qu'est-ce qui est inclus dans le plan gratuit ?",
        a: "Le plan gratuit comprend : 100 Go de bande passante/mois, 1 Go de stockage persistant, des déploiements de prévisualisation illimités, SSL automatique et support communautaire. Parfait pour les projets personnels et les tests."
      },
      {
        q: "Puis-je changer de plan à tout moment ?",
        a: "Oui. Passez à un plan supérieur ou inférieur instantanément sans pénalités. La facturation est calculée au prorata automatiquement, vous ne payez que ce que vous utilisez."
      },
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "Nous acceptons toutes les principales cartes de crédit (Visa, Mastercard, Amex), PayPal, et pouvons organiser la facturation pour les clients entreprise. Toutes les transactions sont en dollars canadiens (CAD)."
      },
      {
        q: "Offrez-vous des réductions pour les startups ou les étudiants ?",
        a: "Oui ! Nous offrons des tarifs spéciaux pour les startups soutenues par YC, les membres du GitHub Student Pack et les entreprises en phase de démarrage. Contactez-nous pour en savoir plus."
      },
      {
        q: "Que se passe-t-il si je dépasse les limites de mon plan ?",
        a: "Nous vous avertirons avant que vous n'atteigniez les limites. Vous pouvez passer à un plan supérieur instantanément ou nous limiterons gracieusement sans mettre vos applications hors ligne."
      }
    ]
  },
  {
    id: "performance",
    title: "Infrastructure et performance",
    icon: Zap,
    questions: [
      {
        q: "Où sont situés les serveurs de Kleff ?",
        a: "Toute l'infrastructure est hébergée au Canada (Toronto, Montréal, Vancouver), garantissant la conformité aux lois canadiennes sur la protection des données et un accès à faible latence pour les utilisateurs nord-américains."
      },
      {
        q: "Quel est votre SLA de disponibilité ?",
        a: "Nous garantissons 99,9 % de disponibilité pour les déploiements en production avec basculement automatique sur plusieurs zones de disponibilité. Les plans entreprise incluent un SLA de 99,99 %."
      },
      {
        q: "Quelle est la vitesse des déploiements ?",
        a: "La plupart des applications se déploient en moins de 60 secondes. Nous utilisons la mise en cache intelligente et les builds incrémentiels — les déploiements suivants sont encore plus rapides, souvent moins de 30 secondes."
      },
      {
        q: "L'auto-scaling fonctionne-t-il automatiquement ?",
        a: "Oui. Vos applications se mettent à l'échelle horizontalement en fonction du trafic automatiquement. Définissez des instances minimum et maximum, et Kleff s'occupe du reste — y compris la réduction à zéro pour les applications inactives."
      },
      {
        q: "Qu'en est-il de la mise à l'échelle des bases de données ?",
        a: "Les bases de données gérées (PostgreSQL, MySQL, MongoDB) se mettent à l'échelle automatiquement avec des réplicas en lecture et le pooling de connexions. Vous pouvez aussi apporter votre propre base de données."
      },
      {
        q: "Comment gérez-vous les pics de trafic ?",
        a: "L'auto-scaling intégré répond au trafic en quelques secondes. Nous offrons aussi la protection DDoS et la limitation de débit pour garder vos applications stables sous toute charge."
      }
    ]
  },
  {
    id: "security",
    title: "Sécurité et conformité",
    icon: Shield,
    questions: [
      {
        q: "Kleff est-il sécurisé ?",
        a: "Sécurité de niveau entreprise : certificats SSL automatiques, protection DDoS, données chiffrées au repos et en transit, gestion des secrets, audits de sécurité réguliers et conformité SOC 2 en cours."
      },
      {
        q: "Kleff est-il conforme aux lois canadiennes sur la vie privée ?",
        a: "Oui. En tant qu'entreprise canadienne avec une infrastructure canadienne, nous sommes entièrement conformes à la LPRPDE et au projet de loi C-11. Vos données restent au Canada et suivent les réglementations canadiennes sur la vie privée."
      },
      {
        q: "Comment fonctionnent les certificats SSL ?",
        a: "Provisionnement et renouvellement automatiques des SSL pour tous les domaines via Let's Encrypt. Les certificats SSL personnalisés sont supportés pour les plans entreprise. Tout le trafic est chiffré par défaut."
      },
      {
        q: "Puis-je utiliser mon propre domaine ?",
        a: "Absolument. Connectez un nombre illimité de domaines personnalisés avec SSL automatique. Supporte les domaines apex, les sous-domaines et les domaines génériques."
      },
      {
        q: "Comment gérez-vous les secrets et les variables d'environnement ?",
        a: "Gestion chiffrée des secrets avec rotation automatique. Les variables d'environnement sont chiffrées au repos et déchiffrées uniquement au moment de l'exécution dans des conteneurs isolés."
      },
      {
        q: "Quelles certifications de conformité avez-vous ?",
        a: "Nous travaillons à l'obtention de la certification SOC 2 Type II. Nous sommes déjà conformes à la LPRPDE et suivons les meilleures pratiques de sécurité OWASP."
      }
    ]
  },
  {
    id: "support",
    title: "Support et ressources",
    icon: Users,
    questions: [
      {
        q: "Quelles options de support sont disponibles ?",
        a: "Le plan gratuit bénéficie du support communautaire (Discord, forums). Les plans payants incluent le support par courriel avec des délais de réponse inférieurs à 24 h. Les clients entreprise obtiennent des canaux Slack dédiés et un support téléphonique."
      },
      {
        q: "Y a-t-il de la documentation disponible ?",
        a: "Documentation complète couvrant les guides de démarrage rapide, les références API, les tutoriels de déploiement, le dépannage et les meilleures pratiques. Plus des tutoriels vidéo et des projets exemples."
      },
      {
        q: "Offrez-vous une assistance à la migration ?",
        a: "Oui ! Les plans entreprise incluent une assistance gratuite à la migration depuis Vercel, Netlify, Heroku ou toute autre plateforme. Nous vous aiderons à déplacer vos applications sans temps d'arrêt."
      },
      {
        q: "Puis-je obtenir de l'aide pour optimiser mes déploiements ?",
        a: "Absolument. Les clients entreprise obtiennent des audits de performance et des recommandations d'optimisation. Nous vous aiderons à réduire les coûts et améliorer la vitesse."
      },
      {
        q: "À quoi ressemble votre documentation API ?",
        a: "API REST complète et API GraphQL avec documentation exhaustive, SDK pour les langages populaires (Node.js, Python, Go, Ruby) et spécifications OpenAPI pour la génération de code."
      },
      {
        q: "Avez-vous une page de statut ?",
        a: "Oui. Page de statut en temps réel montrant la disponibilité, la latence et tout incident dans toutes les régions. Abonnez-vous pour recevoir des notifications en cas de panne."
      }
    ]
  },
  {
    id: "technical",
    title: "Détails techniques",
    icon: Lock,
    questions: [
      {
        q: "Quel runtime de conteneur utilisez-vous ?",
        a: "Nous utilisons containerd sur Kubernetes pour une compatibilité et une sécurité maximales. Toutes les images sont analysées pour les vulnérabilités avant le déploiement."
      },
      {
        q: "Puis-je utiliser Docker Compose ?",
        a: "Oui. Importez vos fichiers docker-compose.yml existants directement. Nous les convertirons automatiquement en déploiements Kubernetes tout en préservant votre configuration."
      },
      {
        q: "Supportez-vous les WebSockets ?",
        a: "Support complet des WebSockets avec drainage automatique des connexions pendant les déploiements pour des mises à jour sans temps d'arrêt."
      },
      {
        q: "Qu'en est-il des tâches cron et des workers en arrière-plan ?",
        a: "Planifiez des tâches cron directement depuis votre tableau de bord ou via l'API. Les workers en arrière-plan se mettent à l'échelle indépendamment de vos processus web."
      },
      {
        q: "Puis-je accéder aux logs de déploiement en temps réel ?",
        a: "Oui. Diffusez les logs en temps réel via le tableau de bord ou le CLI. Les logs sont conservés pendant 30 jours sur les plans payants, 7 jours sur le plan gratuit."
      },
      {
        q: "Supportez-vous les intégrations CI/CD ?",
        a: "Intégrations natives GitHub Actions, GitLab CI et CircleCI. Supporte aussi les webhooks pour les pipelines CI/CD personnalisés."
      }
    ]
  }
];

const faqDataByLocale: Record<Locale, FAQCategory[]> = {
  en: enData,
  fr: frData
};

export function getFaqData(locale: Locale): FAQCategory[] {
  return faqDataByLocale[locale] || enData;
}

/** @deprecated Use getFaqData(locale) instead */
export const faqData = enData;
