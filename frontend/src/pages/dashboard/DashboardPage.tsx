import { getLocale } from "@app/locales/locale";
import { CreateProjectModal } from "@features/projects/components/CreateProjectModal";
import { Badge, type BadgeVariant } from "@shared/ui/Badge";
import { Button } from "@shared/ui/Button";
import { FeatureRow } from "@shared/ui/FeatureRow";
import { GradientIcon } from "@shared/ui/GradientIcon";
import { MiniCard } from "@shared/ui/MiniCard";
import { SoftPanel } from "@shared/ui/SoftPanel";
import { StatBadge } from "@shared/ui/StatBadge";

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Cpu,
  GitBranch,
  Globe,
  HardDrive,
  Lock,
  Server,
  Shield,
  TrendingUp,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";

// Import translations
import enTranslations from "@app/locales/en/dashboard.json";
import frTranslations from "@app/locales/fr/dashboard.json";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

const dashboardData = {
  quickStats: [
    {
      title: "Requests (24h)",
      value: "2.4M",
      change: "+12.3%",
      trend: "up"
    },
    {
      title: "Bandwidth",
      value: "847 GB",
      change: "+8.1%",
      trend: "up"
    },
    {
      title: "Active Deployments",
      value: "12",
      subtitle: "8 regions",
      trend: "neutral"
    },
    {
      title: "Uptime (30d)",
      value: "99.98%",
      subtitle: "Excellent",
      trend: "up"
    }
  ],

  trafficMetrics: {
    totalRequests: {
      value: "2,487,392",
      change: "+12.3% from yesterday",
      trend: "up"
    },
    avgResponseTime: {
      value: "94ms",
      change: "18ms faster",
      trend: "up"
    },
    cacheHitRate: {
      value: "94.2%",
      subtitle: "Optimal performance"
    }
  },

  trafficChart: [
    { height: 65, value: "1.8M", time: "00:00" },
    { height: 78, value: "2.1M", time: "02:00" },
    { height: 82, value: "2.2M", time: "04:00" },
    { height: 71, value: "1.9M", time: "06:00" },
    { height: 88, value: "2.4M", time: "08:00" },
    { height: 92, value: "2.5M", time: "10:00" },
    { height: 85, value: "2.3M", time: "12:00" },
    { height: 79, value: "2.1M", time: "14:00" },
    { height: 95, value: "2.6M", time: "16:00" },
    { height: 100, value: "2.7M", time: "18:00" },
    { height: 97, value: "2.6M", time: "20:00" },
    { height: 89, value: "2.4M", time: "22:00" }
  ],

  recentDeployments: [
    {
      branch: "production",
      commit: "a3f8d2c",
      message: "feat: add user authentication",
      time: "2 minutes ago",
      status: "deployed",
      statusVariant: "success"
    },
    {
      branch: "staging",
      commit: "b7e4f91",
      message: "fix: resolve API timeout issues",
      time: "18 minutes ago",
      status: "building",
      statusVariant: "warning"
    },
    {
      branch: "preview",
      commit: "c9d2a5e",
      message: "chore: update dependencies",
      time: "1 hour ago",
      status: "ready",
      statusVariant: "outline"
    }
  ],

  security: {
    ssl: {
      title: "SSL/TLS",
      status: "Active",
      badge: "Enabled",
      variant: "success"
    },
    ddos: {
      title: "DDoS Protection",
      status: "Under attack mode off",
      badge: "Active",
      variant: "success"
    },
    summary: {
      threats: "847",
      incidents: "0"
    }
  },

  infrastructure: [
    {
      icon: Server,
      title: "Active Regions",
      description: "8 edge locations worldwide"
    },
    {
      icon: Cpu,
      title: "Compute Usage",
      description: "67% capacity • 2.4K vCPU hours"
    },
    {
      icon: HardDrive,
      title: "Storage",
      description: "124 GB used of 500 GB"
    },
    {
      icon: BarChart3,
      title: "DNS Queries",
      description: "1.2M queries in last 24h"
    }
  ],

  quickActions: [
    {
      icon: GitBranch,
      label: "Create New Deployment"
    },
    {
      icon: Activity,
      label: "View Analytics"
    },
    {
      icon: Shield,
      label: "Security Settings"
    }
  ]
};

export function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());

  // Listen for locale changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const t = translations[locale].dashboard;

  return (
    <div className="app-container py-8">
      <section className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-50">{t.overview_title}</h1>
            <p className="mt-1 text-sm text-neutral-400">{t.overview_subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="bg-gradient-kleff rounded-full px-6 text-sm font-semibold text-black shadow-md shadow-black/40 hover:brightness-110"
            >
              {t.deploy_new_project}
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardData.quickStats.map((stat, i) => (
          <MiniCard key={i} title={stat.title}>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-neutral-50">{stat.value}</span>
              {stat.change && (
                <StatBadge color={stat.trend === "up" ? "green" : "white"}>{stat.change}</StatBadge>
              )}
              {stat.subtitle && (
                <StatBadge color={stat.trend === "up" ? "green" : "white"}>
                  {stat.subtitle}
                </StatBadge>
              )}
            </div>
          </MiniCard>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-50">Traffic & Performance</h2>
              <Button variant="ghost" className="text-xs text-neutral-400 hover:text-neutral-200">
                View Analytics <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <SoftPanel>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Globe className="h-4 w-4" />
                    <span>{t.total_requests}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-neutral-50">
                      {dashboardData.trafficMetrics.totalRequests.value}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>{dashboardData.trafficMetrics.totalRequests.change}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Zap className="h-4 w-4" />
                    <span>{t.avg_response_time}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-neutral-50">
                      {dashboardData.trafficMetrics.avgResponseTime.value}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      <span>{dashboardData.trafficMetrics.avgResponseTime.change}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <HardDrive className="h-4 w-4" />
                    <span>{t.cache_hit_rate}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-neutral-50">
                      {dashboardData.trafficMetrics.cacheHitRate.value}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                      <span>{dashboardData.trafficMetrics.cacheHitRate.subtitle}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 h-32 rounded-lg bg-black/40 p-4">
                <div className="flex h-full items-end gap-1">
                  {dashboardData.trafficChart.map((bar, i) => (
                    <div key={i} className="group relative flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t transition-all duration-200 group-hover:brightness-125"
                        style={{
                          height: `${bar.height}%`,
                          background: "linear-gradient(to top, #facc15, #fb923c, #f97316)"
                        }}
                      />
                      <div className="pointer-events-none absolute -top-16 left-1/2 z-10 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div className="rounded-lg border border-white/20 bg-black/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                          <div className="text-xs font-semibold whitespace-nowrap text-neutral-50">
                            {bar.value}
                          </div>
                          <div className="text-[10px] whitespace-nowrap text-neutral-400">
                            {bar.time}
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2">
                          <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-black/95" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SoftPanel>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-50">Recent Deployments</h2>
              <Button variant="ghost" className="text-xs text-neutral-400 hover:text-neutral-200">
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <SoftPanel>
              <div className="space-y-3">
                {dashboardData.recentDeployments.map((deployment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <GradientIcon icon={GitBranch} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-200">
                            {deployment.branch}
                          </span>
                          <span className="font-mono text-xs text-neutral-500">•</span>
                          <span className="font-mono text-xs text-neutral-400">
                            {deployment.commit}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400">
                          {deployment.message} • {deployment.time}
                        </div>
                      </div>
                    </div>
                    <Badge variant={deployment.statusVariant as BadgeVariant}>
                      {deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </SoftPanel>
          </section>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.security}</h2>
            <SoftPanel>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                      <Shield className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-200">
                        {dashboardData.security.ssl.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {dashboardData.security.ssl.status}
                      </div>
                    </div>
                  </div>
                  <Badge variant={dashboardData.security.ssl.variant as BadgeVariant}>
                    {dashboardData.security.ssl.badge}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                      <Lock className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-200">
                        {dashboardData.security.ddos.title}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {dashboardData.security.ddos.status}
                      </div>
                    </div>
                  </div>
                  <Badge variant={dashboardData.security.ddos.variant as BadgeVariant}>
                    {dashboardData.security.ddos.badge}
                  </Badge>
                </div>

                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <div className="text-xs text-emerald-200">
                    <div className="font-medium">24h Security Summary</div>
                    <div className="mt-1 text-emerald-300/80">
                      {dashboardData.security.summary.threats} threats blocked •{" "}
                      {dashboardData.security.summary.incidents} incidents
                    </div>
                  </div>
                </div>
              </div>
            </SoftPanel>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.infrastructure}</h2>
            <SoftPanel>
              <div className="space-y-3">
                {dashboardData.infrastructure.map((item, i) => (
                  <FeatureRow
                    key={i}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
            </SoftPanel>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-50">{t.quick_actions}</h2>
            <div className="space-y-2">
              {dashboardData.quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start border-white/20 bg-white/5 text-sm text-neutral-200 hover:border-white/40 hover:bg-white/10"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </section>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}
