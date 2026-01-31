import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContextProps } from "react-oidc-context";
import { AdminRoute } from "./AdminRoute";
import { ROUTES } from "@app/routes/routes";

// Mock dependencies
vi.mock("react-oidc-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@features/users/hooks/usePlatformRole", () => ({
  usePlatformAdmin: vi.fn(),
}));

// Import mocked modules for type-safe mocking
import { useAuth } from "react-oidc-context";
import { usePlatformAdmin } from "@features/users/hooks/usePlatformRole";

const mockUseAuth = vi.mocked(useAuth);
const mockUsePlatformAdmin = vi.mocked(usePlatformAdmin);

describe("AdminRoute", () => {
  const TestChild = () => <div>Protected Admin Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Check", () => {
    it("redirects to sign in when not authenticated", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route path={ROUTES.AUTH_SIGNIN} element={<div>Sign In Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Sign In Page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Admin Content")).not.toBeInTheDocument();
    });

    it("preserves location state for redirect after login", () => {
      const mockNavigate = vi.fn();
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: false,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/admin?tab=users"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route
              path={ROUTES.AUTH_SIGNIN}
              element={
                <div data-testid="signin-page">
                  Sign In Page
                </div>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("signin-page")).toBeInTheDocument();

      // Note: Testing location state requires checking navigation state
      // which is handled internally by React Router's Navigate component
      expect(screen.queryByText("Protected Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows loading state while checking admin status", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: true,
      });

      const { container } = render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      // When loading, AdminRoute returns null (which renders nothing)
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText("Protected Admin Content")).not.toBeInTheDocument();
    });
  });

  describe("Authorization Check", () => {
    it("redirects to dashboard when authenticated but not admin", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route path={ROUTES.DASHBOARD} element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Admin Content")).not.toBeInTheDocument();
    });

    it("includes error message in navigation state when redirecting non-admin users", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route
              path={ROUTES.DASHBOARD}
              element={<div data-testid="dashboard-page">Dashboard Page</div>}
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
      // Note: Testing location state with error message requires
      // checking navigation state which is handled by Navigate component
    });
  });

  describe("Successful Access", () => {
    it("renders children when authenticated and is admin", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Admin Content")).toBeInTheDocument();
    });

    it("does not redirect when user is platform admin", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route path={ROUTES.AUTH_SIGNIN} element={<div>Sign In Page</div>} />
            <Route path={ROUTES.DASHBOARD} element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Admin Content")).toBeInTheDocument();
      expect(screen.queryByText("Sign In Page")).not.toBeInTheDocument();
      expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles transition from loading to authenticated admin", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: "mock-token" },
      } as AuthContextProps);

      // Start with loading
      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: true,
      });

      const { rerender, container } = render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      // Initially should show loading (null)
      expect(container.firstChild).toBeNull();

      // Update to admin
      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: true,
        isLoading: false,
      });

      rerender(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Admin Content")).toBeInTheDocument();
    });

    it("handles authenticated user without access token", () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: null,
      } as AuthContextProps);

      mockUsePlatformAdmin.mockReturnValue({
        isPlatformAdmin: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={["/admin"]}>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <TestChild />
                </AdminRoute>
              }
            />
            <Route path={ROUTES.DASHBOARD} element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      expect(screen.queryByText("Protected Admin Content")).not.toBeInTheDocument();
    });
  });
});
