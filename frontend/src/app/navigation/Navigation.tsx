import type { ElementType } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Server,
  Cpu,
  Boxes,
  Activity,
  Workflow,
  BookOpenText,
  Code2,
  GitBranch,
  Users,
  RocketIcon,
  ShieldIcon,
  Shield
} from "lucide-react";
import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import { ROUTES } from "@app/routes/routes";
import type { Locale } from "@app/locales/locale";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: ElementType;
  exact?: boolean;
  adminOnly?: boolean; // Only show to platform admins
}

const translations = {
  en: enTranslations,
  fr: frTranslations
};

export function getDashboardNavItems(locale: Locale): DashboardNavItem[] {
  const t = translations[locale];
  return [
    {
      to: ROUTES.DASHBOARD,
      label: t.dashboardNavItems[0].label,
      icon: LayoutDashboard,
      exact: true
    },
    {
      to: ROUTES.DASHBOARD_PROJECTS,
      label: t.dashboardNavItems[1].label,
      icon: FolderKanban
    },
    {
      to: ROUTES.DASHBOARD_SYSTEMS,
      label: t.dashboardNavItems[2].label,
      icon: Server,
      adminOnly: true // Platform admin only
    },
    {
      to: ROUTES.DASHBOARD_ADMIN,
      label: "Admin Panel",
      icon: Shield,
      adminOnly: true // Platform admin only
    }
  ];
}

export function isNavItemActive(pathname: string, item: DashboardNavItem): boolean {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

export interface MegaMenuItem {
  label: string;
  href: string;
  description: string;
  icon: ElementType;
}

export interface MegaMenuSection {
  key: string;
  label: string;
  tagline: string;
  items: MegaMenuItem[];
}

export function getMegaMenuSections(locale: Locale): MegaMenuSection[] {
  const t = translations[locale];
  return [
    {
      key: t.megaMenuSections[0].key,
      label: t.megaMenuSections[0].label,
      tagline: t.megaMenuSections[0].tagline,
      items: [
        {
          label: t.megaMenuSections[0].items[0].label,
          href: ROUTES.HOME,
          description: t.megaMenuSections[0].items[0].description,
          icon: Boxes
        },
        {
          label: t.megaMenuSections[0].items[1].label,
          href: ROUTES.DEPLOYMENTS,
          description: t.megaMenuSections[0].items[1].description,
          icon: GitBranch
        },
        {
          label: t.megaMenuSections[0].items[2].label,
          href: ROUTES.RUNTIME,
          description: t.megaMenuSections[0].items[2].description,
          icon: Cpu
        },
        {
          label: t.megaMenuSections[0].items[3].label,
          href: ROUTES.OBSERVABILITY,
          description: t.megaMenuSections[0].items[3].description,
          icon: Activity
        }
      ]
    },
    {
      key: t.megaMenuSections[1].key,
      label: t.megaMenuSections[1].label,
      tagline: t.megaMenuSections[1].tagline,
      items: [
        {
          label: t.megaMenuSections[1].items[0].label,
          href: ROUTES.DOCS,
          description: t.megaMenuSections[1].items[0].description,
          icon: BookOpenText
        },
        {
          label: t.megaMenuSections[1].items[1].label,
          href: ROUTES.DOCS_API,
          description: t.megaMenuSections[1].items[1].description,
          icon: Code2
        },
        {
          label: t.megaMenuSections[1].items[2].label,
          href: ROUTES.SDKS,
          description: t.megaMenuSections[1].items[2].description,
          icon: Boxes
        },
        {
          label: t.megaMenuSections[1].items[3].label,
          href: ROUTES.CHANGELOG,
          description: t.megaMenuSections[1].items[3].description,
          icon: Workflow
        }
      ]
    },
    {
      key: t.megaMenuSections[2].key,
      label: t.megaMenuSections[2].label,
      tagline: t.megaMenuSections[2].tagline,
      items: [
        {
          label: t.megaMenuSections[2].items[0].label,
          href: ROUTES.SOLUTIONS_STARTUPS,
          description: t.megaMenuSections[2].items[0].description,
          icon: RocketIcon
        },
        {
          label: t.megaMenuSections[2].items[1].label,
          href: ROUTES.SOLUTIONS_AGENCIES,
          description: t.megaMenuSections[2].items[1].description,
          icon: Users
        },
        {
          label: t.megaMenuSections[2].items[2].label,
          href: ROUTES.SOLUTIONS_INDIE,
          description: t.megaMenuSections[2].items[2].description,
          icon: Activity
        },
        {
          label: t.megaMenuSections[2].items[3].label,
          href: ROUTES.SOLUTIONS_ENTERPRISE,
          description: t.megaMenuSections[2].items[3].description,
          icon: ShieldIcon
        }
      ]
    }
  ];
}

export function getSimpleNavLinks(locale: Locale) {
  const t = translations[locale];
  return [
    { href: ROUTES.PRICING, label: t.simpleNavLinks[0].label },
    { href: ROUTES.DOCS, label: t.simpleNavLinks[1].label },
    { href: ROUTES.BLOG, label: t.simpleNavLinks[2].label }
  ];
}
