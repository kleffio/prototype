import axios from "axios";

interface DeactivatedAccountError extends Error {
  status: number;
  isDeactivated: boolean;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080",
  headers: {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0"
  }
});

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for deactivated account errors - can be either 401 or 403
    const status = error.response?.status;
    const isDeactivatedError = 
      (status === 403) || 
      (status === 401 && error.response?.data?.includes?.("deactivated"));
    
    if (isDeactivatedError) {
      const deactivatedError = new Error("Account has been deactivated") as DeactivatedAccountError;
      deactivatedError.status = status;
      deactivatedError.isDeactivated = true;
      return Promise.reject(deactivatedError);
    }
    return Promise.reject(error);
  }
);
