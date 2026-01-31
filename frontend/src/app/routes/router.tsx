import { ErrorPage } from "@app/error/ErrorPage";
import { ProjectDetailPage } from "@pages/projects/ProjectDetailPage";
import { AppLayout } from "@app/layout/AppLayout";
import { DashboardLayout } from "@app/layout/DashboardLayout";
import { ProtectedRoute } from "@app/routing/ProtectedRoute";
import { AdminRoute } from "@app/routing/AdminRoute";
import { ProjectsProvider } from "@features/projects/context/ProjectsContext";
import { DashboardPage } from "@pages/dashboard/DashboardPage";
import { MetricsDashboard } from "@pages/dashboard/MetricsDashboard";
import { LandingPage } from "@pages/landing/LandingPage";
import { ProjectsPage } from "@pages/projects/ProjectsPage";
import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "./routes";
import { SettingsPage } from "@pages/settings/SettingsPage";
import { AboutUsPage } from "@pages/aboutus/AboutUsPage";
import { FAQPage } from "@pages/legal/FAQPage";
import { PrivacyPolicyPage } from "@pages/legal/PrivacyPolicyPage";
import { TermsOfServicePage } from "@pages/legal/TermsOfServicePage";
import { AuthPage } from "@pages/auth/AuthPage";
import PricingPage from "@pages/legal/PricingPage";
import { StatusPage } from "@pages/landing/StatusPage";

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <LandingPage />
      },
      { path: "about", element: <AboutUsPage /> },
      { path: "faq", element: <FAQPage /> },
      { path: "terms", element: <TermsOfServicePage /> },
      { path: "privacy", element: <PrivacyPolicyPage /> },
      { path: "pricing", element: <PricingPage /> },

      { path: "status", element: <StatusPage /> },
      // Auth routes
      {
        path: "auth",
        children: [
          {
            path: "signin",
            element: <AuthPage />
          },
          {
            path: "callback",
            element: <AuthPage />
          },
          {
            path: "silent-callback",
            element: null // Literally here as placeholder btw
          }
        ]
      }
    ]
  },
  //  Dashboard
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: "projects",
        element: (
          <ProjectsProvider>
            <ProjectsPage />
          </ProjectsProvider>
        )
      },
      {
        path: "projects/:projectId",
        element: <ProjectDetailPage />
      },
      {
        path: "systems",
        element: (
          <AdminRoute>
            <MetricsDashboard />
          </AdminRoute>
        )
      }
    ]
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />
  }
]);
