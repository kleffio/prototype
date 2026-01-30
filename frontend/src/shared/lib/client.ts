import axios from "axios";

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

// Response interceptor to handle deactivated account errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for deactivated account errors
    if (error.response?.status === 403 && 
        (error.response?.data?.error?.toLowerCase()?.includes('deactivated') ||
         error.response?.data?.message?.toLowerCase()?.includes('deactivated'))) {
      // Create custom error for deactivated account that the ErrorPage can detect
      const deactivatedError = new Error('Account has been deactivated');
      (deactivatedError as any).status = 403;
      (deactivatedError as any).isDeactivated = true;
      return Promise.reject(deactivatedError);
    }
    return Promise.reject(error);
  }
);