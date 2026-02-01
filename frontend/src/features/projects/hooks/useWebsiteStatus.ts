import { useEffect, useState } from "react";

type WebsiteStatus = "up" | "down" | "checking";

export function useWebsiteStatus(url: string) {
  const [status, setStatus] = useState<WebsiteStatus>(url ? "checking" : "down");
  const [isLoading, setIsLoading] = useState(!!url);

  const pingUrl = async (urlToPing: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(urlToPing, {
        method: "HEAD",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!url) return;

    const checkStatus = async () => {
      setIsLoading(true);
      const isUp = await pingUrl(url);
      setStatus(isUp ? "up" : "down");
      setIsLoading(false);
    };

    // Initial check
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [url]);

  return { status, isLoading };
}
