import React from "react";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { Box, ExternalLink, FileText } from "lucide-react";
import type { Container } from "@features/projects/types/Container";
import { SecureComponent } from "@app/components/SecureComponent";
import enTranslations from "@app/locales/en/projects.json";
import frTranslations from "@app/locales/fr/projects.json";
import { getLocale } from "@app/locales/locale";
import { useWebsiteStatus } from "@features/projects/hooks/useWebsiteStatus";

const translations = {
  en: enTranslations,
  fr: frTranslations
};

interface ContainerStatusCardProps {
  container: Container;
  onManage: (container: Container) => void;
  onViewLogs?: (container: Container) => void;
}

export function ContainerStatusCard({ container, onManage, onViewLogs }: ContainerStatusCardProps) {
  const appUrl = `https://app-${container.containerId}.kleff.io`;
  const [locale, setLocale] = React.useState(getLocale());
  const t = translations[locale].projectDetail.containerDetail;
  const { status } = useWebsiteStatus(appUrl);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocale(currentLocale);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [locale]);

  const handleVisitApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(appUrl, "_blank");
  };

  const handleCardClick = () => {
    onManage(container);
  };

  return (
    <button
      onClick={handleCardClick}
      className="grid w-full cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
    >
      {/* Left side: Icon + Container Name */}
      <div className="flex items-center gap-3">
        <Box className="h-5 w-5 text-blue-400" />
        <span className="font-semibold text-neutral-50">{container.name}</span>
      </div>

      {/* Center: Status Badge */}
      <Badge
        variant={status === "up" ? "success" : status === "down" ? "secondary" : "warning"}
        className="justify-self-center text-xs"
      >
        {status === "up" ? "Up" : status === "down" ? "Down" : "Checking..."}
      </Badge>

      {/* Right side: Actions */}
      <div className="flex items-center justify-end gap-2">
        {onViewLogs && (
          <SecureComponent requiredPermission="VIEW_LOGS">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewLogs(container);
              }}
              className="h-8 px-3 text-xs text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"
            >
              <FileText className="mr-1 h-3 w-3" />
              {t.view_logs}
            </Button>
          </SecureComponent>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleVisitApp}
          className="h-8 px-3 text-xs text-blue-400 hover:bg-blue-400/10 hover:text-blue-300"
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          {t.visit_app}
        </Button>
      </div>
    </button>
  );
}
