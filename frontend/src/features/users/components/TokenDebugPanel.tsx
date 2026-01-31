import { Button } from "@shared/ui/Button";
import { Code, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import { Me } from "@features/users/api/me";

export function TokenDebugPanel() {
  const auth = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToken = () => {
    if (auth.user?.access_token) {
      navigator.clipboard.writeText(auth.user.access_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const testApi = async () => {
    if (!auth.user?.access_token) return;

    try {
      await Me(auth.user.access_token);
      alert("✅ API call successful! Check console for details.");
    } catch (error) {
      alert("❌ API call failed. Check console for details.");
    }
  };

  if (!auth.isAuthenticated) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-2xl">
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-kleff flex items-center gap-2 shadow-lg"
        >
          <Code className="h-4 w-4" />
          Debug Auth
        </Button>
      ) : (
        <div className="rounded-xl border border-white/20 bg-black/95 p-4 shadow-2xl backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code className="h-4 w-4" />
              Authentication Debug
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Access Token */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">
                Access Token
              </label>
              <div className="flex gap-2">
                <div className="flex-1 overflow-hidden rounded border border-white/20 bg-white/5 p-2 font-mono text-[10px] text-white">
                  <div className="overflow-x-auto">
                    {auth.user?.access_token?.substring(0, 100)}...
                  </div>
                </div>
                <Button size="sm" onClick={copyToken} className={copied ? "bg-green-600" : ""}>
                  {copied ? "✓" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Token Expiry */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-neutral-400">Expires At</label>
                <div className="rounded border border-white/20 bg-white/5 p-2 text-white">
                  {new Date((auth.user?.expires_at || 0) * 1000).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-neutral-400">User</label>
                <div className="rounded border border-white/20 bg-white/5 p-2 text-white">
                  {auth.user?.profile.preferred_username || auth.user?.profile.email || "Unknown"}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">
                Token Claims
              </label>
              <pre className="max-h-40 overflow-auto rounded border border-white/20 bg-white/5 p-2 font-mono text-[10px] text-white">
                {JSON.stringify(auth.user?.profile, null, 2)}
              </pre>
            </div>

            {/* Test Button */}
            <div className="flex gap-2 pt-2">
              <Button onClick={testApi} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Test API Call
              </Button>
              <Button
                onClick={() => {/* Debug functionality removed */}}
                variant="outline"
                className="flex-1"
                disabled
              >
                Debug Disabled
              </Button>
            </div>

            {/* Quick Instructions */}
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200">
              <strong>Quick Test:</strong> Click "Test API Call" to verify your backend is receiving
              the token correctly. Check the browser console for detailed logs.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
