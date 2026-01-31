import { useState, useEffect } from "react";
import { client } from "@shared/lib/client";

export async function getUsernameById(userID: string): Promise<string> {
  const response = await client.get<{ username: string }>(`/api/v1/users/${userID}`);
  return response.data.username;
}

export function useUsername(userID: string) {
  const [username, setUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userID) {
      setUsername("");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUsername() {
      try {
        setIsLoading(true);
        const name = await getUsernameById(userID);
        if (!cancelled) {
          setUsername(name);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch username"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchUsername();

    return () => {
      cancelled = true;
    };
  }, [userID]);

  return { username, isLoading, error };
}
