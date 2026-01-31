import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthContextProps } from "react-oidc-context";
import { usePlatformAdmin } from "./usePlatformRole";
import type { PlatformRolesResponse } from "../api/getPlatformRoles";

// Mock dependencies
vi.mock("react-oidc-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/getPlatformRoles", () => ({
  getPlatformRoles: vi.fn(),
}));

// Import mocked modules for type-safe mocking
import { useAuth } from "react-oidc-context";
import { getPlatformRoles } from "../api/getPlatformRoles";

const mockUseAuth = vi.mocked(useAuth);
const mockGetPlatformRoles = vi.mocked(getPlatformRoles);

describe("usePlatformAdmin", () => {
  // Mock console.error to avoid cluttering test output
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("Initial State", () => {
    it("returns false and loading true initially", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as AuthContextProps);

      const { result } = renderHook(() => usePlatformAdmin());

      // Initial state
      expect(result.current.isPlatformAdmin).toBe(false);
      expect(result.current.isLoading).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Unauthenticated User", () => {
    it("returns false when not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as AuthContextProps);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(mockGetPlatformRoles).not.toHaveBeenCalled();
    });

    it("returns false when authenticated but no access token", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: null,
      } as AuthContextProps);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(mockGetPlatformRoles).not.toHaveBeenCalled();
    });

    it("returns false when user object exists but no access token", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: {} as AuthContextProps["user"],
      } as AuthContextProps);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(mockGetPlatformRoles).not.toHaveBeenCalled();
    });
  });

  describe("Authenticated User - Platform Admin", () => {
    it("returns true when user has platform_admin role", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["platform_admin"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(true);
      expect(mockGetPlatformRoles).toHaveBeenCalledWith(mockAccessToken);
      expect(mockGetPlatformRoles).toHaveBeenCalledTimes(1);
    });

    it("returns true when user has platform_admin among multiple roles", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["user", "platform_admin", "moderator"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(true);
      expect(mockGetPlatformRoles).toHaveBeenCalledWith(mockAccessToken);
    });
  });

  describe("Authenticated User - Not Admin", () => {
    it("returns false when user has no admin role", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["user"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(mockGetPlatformRoles).toHaveBeenCalledWith(mockAccessToken);
    });

    it("returns false when user has empty roles array", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: [],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
    });

    it("returns false when user has different admin roles but not platform_admin", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["admin", "super_admin", "moderator"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("handles API errors gracefully", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockError = new Error("API Error");
      mockGetPlatformRoles.mockRejectedValue(mockError);

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to check platform admin status:",
        mockError
      );
    });

    it("sets loading to false after error", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      mockGetPlatformRoles.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => usePlatformAdmin());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
    });

    it("handles network timeout errors", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      mockGetPlatformRoles.mockRejectedValue(new Error("Request timeout"));

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
      expect(mockGetPlatformRoles).toHaveBeenCalledTimes(1);
    });

    it("handles 401 unauthorized errors", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      mockGetPlatformRoles.mockRejectedValue({ response: { status: 401 } });

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
    });

    it("handles 403 forbidden errors", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      mockGetPlatformRoles.mockRejectedValue({ response: { status: 403 } });

      const { result } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(false);
    });
  });

  describe("Loading State Management", () => {
    it("sets loading to false after check completes successfully", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["platform_admin"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => usePlatformAdmin());

      // Should start as loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(true);
    });

    it("maintains loading state during API call", async () => {
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      let resolvePromise: (value: PlatformRolesResponse) => void;
      const mockPromise = new Promise<PlatformRolesResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetPlatformRoles.mockReturnValue(mockPromise);

      const { result } = renderHook(() => usePlatformAdmin());

      // Should be loading while API call is in progress
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPlatformAdmin).toBe(false);

      // Resolve the promise
      resolvePromise!({ roles: ["platform_admin"] });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isPlatformAdmin).toBe(true);
    });
  });

  describe("Re-execution on Auth Changes", () => {
    it("re-checks admin status when authentication state changes", async () => {
      const { rerender } = renderHook(() => usePlatformAdmin());

      // Initially not authenticated
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      } as AuthContextProps);

      rerender();

      await waitFor(() => {
        expect(mockGetPlatformRoles).not.toHaveBeenCalled();
      });

      // User logs in
      const mockAccessToken = "mock-access-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: mockAccessToken },
      } as AuthContextProps);

      const mockResponse: PlatformRolesResponse = {
        roles: ["platform_admin"],
      };
      mockGetPlatformRoles.mockResolvedValue(mockResponse);

      rerender();

      await waitFor(() => {
        expect(mockGetPlatformRoles).toHaveBeenCalledWith(mockAccessToken);
      });
    });

    it("re-checks admin status when access token changes", async () => {
      const firstToken = "first-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: firstToken },
      } as AuthContextProps);

      mockGetPlatformRoles.mockResolvedValue({ roles: ["platform_admin"] });

      const { rerender } = renderHook(() => usePlatformAdmin());

      await waitFor(() => {
        expect(mockGetPlatformRoles).toHaveBeenCalledWith(firstToken);
      });

      // Token changes
      const secondToken = "second-token";
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { access_token: secondToken },
      } as AuthContextProps);

      rerender();

      await waitFor(() => {
        expect(mockGetPlatformRoles).toHaveBeenCalledWith(secondToken);
      });

      expect(mockGetPlatformRoles).toHaveBeenCalledTimes(2);
    });
  });
});
