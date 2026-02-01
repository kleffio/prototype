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
  ShieldIcon
} from "lucide-react";
import enTranslations from "@app/locales/en/components.json";
import frTranslations from "@app/locales/fr/components.json";
import { ROUTES } from "@app/routes/routes";

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

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    to: ROUTES.DASHBOARD,
    label: translations.en.dashboardNavItems[0].label,
    icon: LayoutDashboard,
    exact: true
  },
  {
    to: ROUTES.DASHBOARD_PROJECTS,
    label: translations.en.dashboardNavItems[1].label,
    icon: FolderKanban
  },
  {
    to: ROUTES.DASHBOARD_SYSTEMS,
    label: translations.en.dashboardNavItems[2].label,
    icon: Server,
    adminOnly: true // Platform admin only
  }
];

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

export const MEGA_MENU_SECTIONS: MegaMenuSection[] = [
  {
    key: translations.en.megaMenuSections[0].key,
    label: translations.en.megaMenuSections[0].label,
    tagline: translations.en.megaMenuSections[0].tagline,
    items: [
      {
        label: translations.en.megaMenuSections[0].items[0].label,
        href: ROUTES.HOME,
        description: translations.en.megaMenuSections[0].items[0].description,
        icon: Boxes
      },
      {
        label: translations.en.megaMenuSections[0].items[1].label,
        href: ROUTES.DEPLOYMENTS,
        description: translations.en.megaMenuSections[0].items[1].description,
        icon: GitBranch
      },
      {
        label: translations.en.megaMenuSections[0].items[2].label,
        href: ROUTES.RUNTIME,
        description: translations.en.megaMenuSections[0].items[2].description,
        icon: Cpu
      },
      {
        label: translations.en.megaMenuSections[0].items[3].label,
        href: ROUTES.OBSERVABILITY,
        description: translations.en.megaMenuSections[0].items[3].description,
        icon: Activity
      }
    ]
  },
  {
    key: translations.en.megaMenuSections[1].key,
    label: translations.en.megaMenuSections[1].label,
    tagline: translations.en.megaMenuSections[1].tagline,
    items: [
      {
        label: translations.en.megaMenuSections[1].items[0].label,
        href: ROUTES.DOCS,
        description: translations.en.megaMenuSections[1].items[0].description,
        icon: BookOpenText
      },
      {
        label: translations.en.megaMenuSections[1].items[1].label,
        href: ROUTES.DOCS_API,
        description: translations.en.megaMenuSections[1].items[1].description,
        icon: Code2
      },
      {
        label: translations.en.megaMenuSections[1].items[2].label,
        href: ROUTES.SDKS,
        description: translations.en.megaMenuSections[1].items[2].description,
        icon: Boxes
      },
      {
        label: translations.en.megaMenuSections[1].items[3].label,
        href: ROUTES.CHANGELOG,
        description: translations.en.megaMenuSections[1].items[3].description,
        icon: Workflow
      }
    ]
  },
  {
    key: translations.en.megaMenuSections[2].key,
    label: translations.en.megaMenuSections[2].label,
    tagline: translations.en.megaMenuSections[2].tagline,
    items: [
      {
        label: translations.en.megaMenuSections[2].items[0].label,
        href: ROUTES.SOLUTIONS_STARTUPS,
        description: translations.en.megaMenuSections[2].items[0].description,
        icon: RocketIcon
      },
      {
        label: translations.en.megaMenuSections[2].items[1].label,
        href: ROUTES.SOLUTIONS_AGENCIES,
        description: translations.en.megaMenuSections[2].items[1].description,
        icon: Users
      },
      {
        label: translations.en.megaMenuSections[2].items[2].label,
        href: ROUTES.SOLUTIONS_INDIE,
        description: translations.en.megaMenuSections[2].items[2].description,
        icon: Activity
      },
      {
        label: translations.en.megaMenuSections[2].items[3].label,
        href: ROUTES.SOLUTIONS_ENTERPRISE,
        description: translations.en.megaMenuSections[2].items[3].description,
        icon: ShieldIcon
      }
    ]
  }
];

export const SIMPLE_NAV_LINKS = [
  { href: ROUTES.PRICING, label: translations.en.simpleNavLinks[0].label },
  { href: ROUTES.DOCS, label: translations.en.simpleNavLinks[1].label },
  { href: ROUTES.BLOG, label: translations.en.simpleNavLinks[2].label }
];
