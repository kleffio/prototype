import { useState, useEffect } from "react";
import { Badge } from "@shared/ui/Badge";
import { FeatureRow } from "@shared/ui/FeatureRow";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { MiniCard } from "@shared/ui/MiniCard";
import { Section, SectionHeader } from "@shared/ui/Section";
import { Activity, ArrowRight, Check, Cpu, DollarSign, Globe, Shield, Zap } from "lucide-react";
import { getLocale } from "../../app/locales/locale";

import enTranslations from "@app/locales/en/aboutus.json";
import frTranslations from "@app/locales/fr/aboutus.json";

const translations = { en: enTranslations, fr: frTranslations };

export function AboutUsPage() {
  const [locale, setLocaleState] = useState(getLocale());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) setLocaleState(currentLocale);
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].aboutus;

  return (
    <div className="relative isolate overflow-hidden">
      <Section className="flex flex-col items-center gap-12 px-4 pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
        <div className="max-w-3xl space-y-6">
          <Badge
            variant="gradient"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-black/60" />
            <span>{t.badge}</span>
          </Badge>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.hero_title_line1}
              <br />
              <span className="text-gradient-kleff">{t.hero_title_line2}</span>
            </h1>
            <p className="text-sm text-neutral-300 sm:text-base">{t.hero_subtitle}</p>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <div className="glass-panel p-6 text-center sm:p-8 lg:p-12">
            <p className="text-lg leading-relaxed font-medium text-white sm:text-xl lg:text-2xl">
              {t.belief_line1} <span className="text-gradient-kleff">{t.belief_highlight}</span>{" "}
              {t.belief_line2}
            </p>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <SectionHeader
          label={t.why_kleff.label}
          title={t.why_kleff.title}
          description={t.why_kleff.description}
        />
        <div className="glass-panel-soft p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <FeatureRow
              icon={(props) => <GradientIcon icon={DollarSign} {...props} />}
              title={t.why_kleff.features.transparent_pricing.title}
              description={t.why_kleff.features.transparent_pricing.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Globe} {...props} />}
              title={t.why_kleff.features.proudly_canadian.title}
              description={t.why_kleff.features.proudly_canadian.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Zap} {...props} />}
              title={t.why_kleff.features.lightning_fast.title}
              description={t.why_kleff.features.lightning_fast.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Shield} {...props} />}
              title={t.why_kleff.features.enterprise_security.title}
              description={t.why_kleff.features.enterprise_security.description}
            />
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <SectionHeader
          label={t.tech_stack.label}
          title={t.tech_stack.title}
          description={t.tech_stack.description}
        />

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Cpu} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.backend.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.backend.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Go
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Java
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Spring Boot
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Activity} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.frontend.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.frontend.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                TypeScript
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                React
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Tailwind CSS
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Shield} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.database.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.database.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                PostgreSQL
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Redis
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Zap} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.orchestration.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.orchestration.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Kubernetes
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Docker
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Helm
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Activity} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.observability.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.observability.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Prometheus
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Grafana
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Jaeger
              </span>
            </div>
          </div>

          <div className="glass-panel p-6">
            <div className="mb-4">
              <GradientIcon icon={Globe} />
            </div>
            <div className="mb-2 text-sm font-semibold text-neutral-50">
              {t.tech_stack.security_auth.title}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
              {t.tech_stack.security_auth.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                Authentik
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                OAuth 2.0
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-300">
                OIDC
              </span>
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              {t.why_developers.label}
            </h2>
            <p className="mb-6 text-sm text-neutral-200">
              {t.why_developers.subtitle}{" "}
              <span className="font-mono">{t.why_developers.subtitle_code}</span>{" "}
              {t.why_developers.subtitle_end}
            </p>
            <div className="grid gap-3 text-left text-[11px] text-neutral-300 sm:grid-cols-3">
              <MiniCard
                title={t.why_developers.deploy.title}
                description={t.why_developers.deploy.description}
              />
              <MiniCard
                title={t.why_developers.scale.title}
                description={t.why_developers.scale.description}
              />
              <MiniCard
                title={t.why_developers.compliant.title}
                description={t.why_developers.compliant.description}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="glass-panel-soft p-8">
            <h2 className="mb-6 text-center text-2xl font-semibold text-white">
              {t.commitment.title}{" "}
              <span className="text-gradient-kleff">{t.commitment.title_highlight}</span>
            </h2>
            <div className="space-y-3">
              {t.commitment.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-gradient-kleff flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                    <Check className="h-3 w-3 text-black" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-50">{item.title}</h3>
                    <p className="text-[11px] text-neutral-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-panel p-12">
            <h2 className="mb-4 text-3xl font-semibold text-white">{t.cta.title}</h2>
            <p className="mb-8 text-sm text-neutral-300">{t.cta.subtitle}</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="/dashboard"
                className="bg-gradient-kleff w-full rounded-full px-8 py-2.5 text-sm font-semibold text-black shadow-md shadow-black/40 transition-all hover:brightness-110 sm:w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  {t.cta.start_building}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
              <a
                href="/pricing"
                className="w-full rounded-full border border-white/20 bg-white/5 px-8 py-2.5 text-sm font-semibold text-neutral-100 transition-all hover:border-white/40 hover:bg-white/10 sm:w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  {t.cta.view_pricing}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
