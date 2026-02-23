import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { Section, SectionHeader } from "@shared/ui/Section";
import { GradientIcon } from "@shared/ui/GradientIcon";
import {
  Activity,
  Boxes,
  CheckCircle2,
  Cpu,
  GitBranch,
  Shield,
  SignalHigh,
  Timer,
  Workflow,
  Zap
} from "lucide-react";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { FeatureRow } from "@shared/ui/FeatureRow";
import { MiniCard } from "@shared/ui/MiniCard";
import { getLocale } from "../../app/locales/locale";
import { DeployPreviewCard } from "@shared/widget/DeployPreviewCard";

import enLanding from "@app/locales/en/landing.json";
import frLanding from "@app/locales/fr/landing.json";

import { ROUTES } from "@app/routes/routes";
import { UptimeCircle } from "@features/observability/components/UptimeCircle";

export function LandingPage() {
  const [locale, setLocaleState] = useState(getLocale());

  const translations = {
    en: enLanding,
    fr: frLanding
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].landing;

  return (
    <div className="relative isolate overflow-hidden">
      {/* WCAG 2.0 AA: Main content with id for skip link target */}
      <main id="main-content" tabIndex={-1}>
        <h1 className="sr-only">Kleff Hosting - Open-Source Cloud Deployments</h1>
      </main>

      <Section className="flex flex-col items-center gap-12 pt-20 pb-16 text-center lg:flex-row lg:items-start lg:py-24 lg:text-left">
        <div className="mx-auto max-w-xl flex-1 space-y-7 text-center lg:mx-0 lg:text-left">
          <div className="mx-auto inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] text-neutral-300 sm:hidden">
            {t.badges.open_source}
          </div>
          <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex lg:justify-start">
            <Badge
              variant="gradient"
              className="flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-black/60" />
              <span>{t.badges.open_source_platform}</span>
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-white/20 px-3 py-1 text-[11px] font-medium text-neutral-200"
            >
              {t.badges.self_hosted}
            </Badge>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.hero.title_line1}
              <br className="hidden sm:block" />
              <span className="text-gradient-kleff">{t.hero.title_line2}</span>
            </h1>
            <p className="text-sm text-neutral-300 sm:text-base">{t.hero.subtitle}</p>
          </div>

          <div className="grid gap-3 text-left text-[11px] text-neutral-300 sm:grid-cols-3">
            <MiniCard
              title={t.mini_cards.git_push.title}
              description={t.mini_cards.git_push.description}
            />
            <MiniCard
              title={t.mini_cards.self_hosted.title}
              description={t.mini_cards.self_hosted.description}
            />
            <MiniCard
              title={t.mini_cards.batteries.title}
              description={t.mini_cards.batteries.description}
            />
          </div>

          <div className="mx-auto flex flex-col items-center gap-3 pt-2 sm:flex-row sm:items-center sm:justify-center lg:mx-0 lg:justify-start">
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="bg-gradient-kleff w-full rounded-full px-8 text-sm font-semibold text-black shadow-md shadow-black/40 hover:brightness-110"
              >
                {t.hero.get_started}
              </Button>
            </Link>
            <Link to="/docs" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full border-white/20 bg-white/5 text-sm font-semibold text-neutral-100 hover:border-white/40 hover:bg-white/10"
              >
                {t.hero.view_docs}
              </Button>
            </Link>
          </div>

          <div className="mt-2 flex w-full justify-center text-[11px] text-neutral-500 sm:hidden">
            <span>{t.trusted_by.mobile}</span>
          </div>

          <div className="hidden flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-3 text-[11px] text-neutral-500 sm:flex lg:justify-start">
            <span className="font-medium text-neutral-400">{t.trusted_by.prefix}</span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.15em] text-neutral-400 uppercase">
              {t.trusted_by.nextjs}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.15em] text-neutral-400 uppercase">
              {t.trusted_by.go_apis}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.15em] text-neutral-400 uppercase">
              {t.trusted_by.microservices}
            </span>
          </div>
        </div>

        <div className="max-w-lg flex-1">
          <DeployPreviewCard key={locale} preview={t.preview} />
        </div>
      </Section>

      <Section className="pb-14">
        <SoftPanel>
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
                {t.why_kleff.label}
              </h2>
              <p className="mt-2 text-sm text-neutral-200">
                {t.why_kleff.title} <span className="font-mono">{t.why_kleff.title_code}</span>{" "}
                {t.why_kleff.title_end}
              </p>
            </div>
            <p className="max-w-sm text-xs text-neutral-400">{t.why_kleff.description}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <FeatureRow
              icon={(props) => <GradientIcon icon={SignalHigh} {...props} />}
              title={t.why_kleff.features.fast.title}
              description={t.why_kleff.features.fast.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Boxes} {...props} />}
              title={t.why_kleff.features.open.title}
              description={t.why_kleff.features.open.description}
            />
            <FeatureRow
              icon={(props) => <GradientIcon icon={Activity} {...props} />}
              title={t.why_kleff.features.visibility.title}
              description={t.why_kleff.features.visibility.description}
            />
          </div>
        </SoftPanel>
      </Section>

      <Section className="pb-14">
        <SoftPanel className="relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-green-500/5 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 py-4 md:flex-row md:gap-8">
            <div className="shrink-0">
              <UptimeCircle size={140} strokeWidth={10} locale={locale} />
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <div className="mb-1 flex items-center justify-center gap-2 md:justify-start">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-semibold tracking-[0.15em] text-green-400 uppercase">
                    {t.reliability.badge}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-neutral-50">{t.reliability.title}</h3>
                <p className="mt-2 text-sm text-neutral-400">{t.reliability.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                    <Zap className="h-3 w-3 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-neutral-300">
                      {t.reliability.features.zero_downtime.title}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {t.reliability.features.zero_downtime.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-neutral-300">
                      {t.reliability.features.health_monitoring.title}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {t.reliability.features.health_monitoring.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SoftPanel>
      </Section>

      <Section className="pb-16">
        <SectionHeader
          label={t.platform.label}
          title={t.platform.title}
          description={t.platform.description}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <SoftPanel>
            <div className="flex items-center gap-3 pb-2">
              <GradientIcon icon={GitBranch} />
              <div>
                <div className="text-sm font-semibold text-neutral-50">
                  {t.platform.deployments.title}
                </div>
                <div className="text-xs text-neutral-400">{t.platform.deployments.description}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-neutral-400">
              <FeatureRow
                icon={Timer}
                title={t.platform.deployments.preview.title}
                description={t.platform.deployments.preview.description}
              />
              <FeatureRow
                icon={SignalHigh}
                title={t.platform.deployments.rollbacks.title}
                description={t.platform.deployments.rollbacks.description}
              />
            </div>
          </SoftPanel>

          <SoftPanel>
            <div className="flex items-center gap-3 pb-2">
              <GradientIcon icon={Shield} />
              <div>
                <div className="text-sm font-semibold text-neutral-50">
                  {t.platform.identity.title}
                </div>
                <div className="text-xs text-neutral-400">{t.platform.identity.description}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-neutral-400">
              <FeatureRow
                icon={Boxes}
                title={t.platform.identity.multi_tenant.title}
                description={t.platform.identity.multi_tenant.description}
              />
              <FeatureRow
                icon={Workflow}
                title={t.platform.identity.audit.title}
                description={t.platform.identity.audit.description}
              />
            </div>
          </SoftPanel>

          <SoftPanel>
            <div className="flex items-center gap-3 pb-2">
              <GradientIcon icon={Cpu} />
              <div>
                <div className="text-sm font-semibold text-neutral-50">
                  {t.platform.observability.title}
                </div>
                <div className="text-xs text-neutral-400">
                  {t.platform.observability.description}
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-neutral-400">
              <FeatureRow
                icon={Activity}
                title={t.platform.observability.dashboards.title}
                description={t.platform.observability.dashboards.description}
              />
              <FeatureRow
                icon={Workflow}
                title={t.platform.observability.integrations.title}
                description={t.platform.observability.integrations.description}
              />
            </div>
          </SoftPanel>
        </div>
      </Section>

      <Section className="pb-20">
        <div className="glass-panel flex flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:py-9 sm:text-left">
          <div className="max-w-xl space-y-2">
            <h2 className="text-xl font-semibold text-neutral-50 sm:text-2xl">{t.cta.title}</h2>
            <p className="text-sm text-neutral-400">{t.cta.description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={ROUTES.TEMPLATES}>
              <Button
                size="lg"
                className="bg-gradient-kleff w-full rounded-full px-7 text-sm font-semibold text-black shadow-md shadow-black/40 hover:brightness-110 sm:w-auto"
              >
                {t.cta.view_templates}
              </Button>
            </Link>
            <Link to={ROUTES.EXAMPLES}>
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-full border-white/20 bg-white/5 text-sm font-semibold text-neutral-100 hover:border-white/40 hover:bg-white/10 sm:w-auto"
              >
                {t.cta.browse_examples}
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
