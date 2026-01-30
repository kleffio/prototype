import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { Button } from "@shared/ui/Button";
import { Badge } from "@shared/ui/Badge";
import { AlertTriangle, Home, RefreshCcw, ArrowLeft } from "lucide-react";

import { AppHeader } from "@app/layout/AppHeader";
import { AppFooter } from "@app/layout/components/AppFooter";
import { DeactivatedAccountError } from "./DeactivatedAccountError";

interface ErrorDetails {
  status: number;
  statusText: string;
  message: string;
  stack?: string;
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (isRouteErrorResponse(error)) {
    return {
      status: error.status,
      statusText: error.statusText,
      message: error.data?.message || error.statusText || "An error occurred"
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      statusText: "Internal Server Error",
      message: error.message,
      stack: error.stack
    };
  }

  return {
    status: 500,
    statusText: "Unknown Error",
    message: "An unexpected error occurred"
  };
}

function getErrorIcon(status: number) {
  if (status === 404) {
    return "\u{1F50D}"; // 🔍
  } else if (status === 403) {
    return "\u{1F512}"; // 🔒
  } else if (status === 401) {
    return "\u{1F511}"; // 🔑
  } else if (status >= 500) {
    return "\u{26A0}"; // ⚠️
  }
  return "\u{274C}"; // ❌
}

function getErrorTitle(status: number) {
  switch (status) {
    case 404:
      return "Page Not Found";
    case 403:
      return "Access Forbidden";
    case 401:
      return "Unauthorized";
    case 500:
      return "Internal Server Error";
    case 503:
      return "Service Unavailable";
    default:
      return "Something Went Wrong";
  }
}

function getErrorDescription(status: number) {
  switch (status) {
    case 404:
      return "The page you're looking for doesn't exist or has been moved.";
    case 403:
      return "You don't have permission to access this resource.";
    case 401:
      return "You need to be authenticated to access this resource.";
    case 500:
      return "Our server encountered an error processing your request.";
    case 503:
      return "The service is temporarily unavailable. Please try again later.";
    default:
      return "We encountered an unexpected error. Please try again.";
  }
}

export function ErrorPage() {
  const error = useRouteError();
  const errorDetails = getErrorDetails(error);
  const isDevelopment = import.meta.env.DEV;

  
  const isDeactivatedAccount = errorDetails.status === 403 && 
    (errorDetails.message.toLowerCase().includes('deactivated') || 
     errorDetails.message.toLowerCase().includes('account has been deactivated'));

  
  if (isDeactivatedAccount) {
    return <DeactivatedAccountError />;
  }

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="bg-kleff-bg relative isolate flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="bg-modern-noise bg-kleff-spotlight h-full w-full opacity-60" />
        <div className="bg-kleff-grid absolute inset-0 opacity-[0.25]" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-white/10 via-transparent" />

      <AppHeader />

      <main className="flex flex-1 items-center">
        <div className="app-container py-20">
          <div className="mx-auto max-w-2xl">
            <div className="glass-panel relative overflow-hidden p-8 text-center sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-red-500/5 via-transparent to-amber-500/5" />

              <div className="relative space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-6xl" role="img" aria-label="Error icon">
                    {getErrorIcon(errorDetails.status)}
                  </span>
                  <div className="flex flex-col items-start gap-2">
                    <Badge variant="destructive" className="text-xs">
                      Error {errorDetails.status}
                    </Badge>
                    <span className="text-left font-mono text-xs text-neutral-500">
                      {errorDetails.statusText}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-neutral-50">
                    {getErrorTitle(errorDetails.status)}
                  </h1>
                  <p className="text-sm text-neutral-400">
                    {getErrorDescription(errorDetails.status)}
                  </p>
                </div>

                {errorDetails.message && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3 text-left">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs font-semibold text-red-200">Error Details</p>
                        <p className="font-mono text-xs text-red-300">{errorDetails.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isDevelopment && errorDetails.stack && (
                  <details className="group rounded-xl border border-white/10 bg-black/40 text-left">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-neutral-400 hover:text-neutral-200">
                      Stack Trace (Development Only)
                    </summary>
                    <div className="border-t border-white/10 px-4 py-3">
                      <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed text-neutral-500">
                        {errorDetails.stack}
                      </pre>
                    </div>
                  </details>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
                  <Button
                    onClick={handleGoBack}
                    variant="outline"
                    className="border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh Page
                  </Button>
                  <Link to="/">
                    <Button className="bg-gradient-kleff w-full font-semibold text-black hover:brightness-110">
                      <Home className="h-4 w-4" />
                      Go Home
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-neutral-500">
                  If this problem persists, please{" "}
                  <Link to="/support" className="text-primary hover:underline">
                    contact support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
