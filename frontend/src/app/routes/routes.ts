export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  FAQ: "/faq",
  PRICING: "/pricing",
  DOCS: "/docs",
  DOCS_API: "/docs/api",
  BLOG: "/blog",
  CHANGELOG: "/changelog",
  STATUS: "/status",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  SUPPORT: "/support",
  SDKS: "/sdks",
  EXAMPLES: "/examples",
  TEMPLATES: "/templates",

  DEPLOYMENTS: "/deployments",
  RUNTIME: "/runtime",
  OBSERVABILITY: "/observability",

  SOLUTIONS_STARTUPS: "/solutions/startups",
  SOLUTIONS_AGENCIES: "/solutions/agencies",
  SOLUTIONS_INDIE: "/solutions/indie",
  SOLUTIONS_ENTERPRISE: "/solutions/enterprise",

  AUTH_SIGNIN: "/auth/signin",
  AUTH_CALLBACK: "/auth/callback",

  DASHBOARD: "/dashboard",
  DASHBOARD_PROJECTS: "/dashboard/projects",
  DASHBOARD_SYSTEMS: "/dashboard/systems",
  DASHBOARD_ADMIN: "/dashboard/admin",
  SETTINGS: "/settings"
} as const;

export const RouteHelpers = {
  matches: (pathname: string, route: string, exact = false): boolean => {
    if (exact) {
      return pathname === route;
    }
    return pathname.startsWith(route);
  },

  isDashboard: (pathname: string): boolean => {
    return pathname.startsWith(ROUTES.DASHBOARD);
  },

  isAuth: (pathname: string): boolean => {
    return pathname.startsWith("/auth");
  },

  withQuery: (route: string, params: Record<string, string>): string => {
    const url = new URL(route, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.pathname + url.search;
  },

  withHash: (route: string, hash: string): string => {
    return `${route}#${hash}`;
  }
};

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
