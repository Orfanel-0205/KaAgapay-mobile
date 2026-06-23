// services/api/client.ts

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { ensureHydration, useAuthStore } from "../../store/useAuthStore";

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.51.37:8000";

const API_ORIGIN = cleanUrl(RAW_API_URL);

const BASE_URL = API_ORIGIN.endsWith("/api/v1")
  ? API_ORIGIN
  : `${API_ORIGIN}/api/v1`;

function isExpectedSilentError(error: AxiosError<any>): boolean {
  const url = String(error.config?.url ?? "");
  const status = error.response?.status;
  const message = String(error.response?.data?.message ?? "").toLowerCase();

  if (
    status === 404 &&
    url.includes("/queue/my-ticket") &&
    message.includes("no resident profile")
  ) {
    return true;
  }

  if (status === 404 && url.includes("/queue/my-ticket")) {
    return true;
  }

  return false;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    await ensureHydration();

    const { token } = useAuthStore.getState();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (__DEV__) {
      const isPublicRoute =
        config.url?.includes("/login") ||
        config.url?.includes("/register") ||
        config.url?.includes("/programs") ||
        config.url?.includes("/barangays") ||
        config.url?.includes("/health");

      if (!isPublicRoute) {
        console.warn(
          `[API] ⚠️ No token for request: ${config.method?.toUpperCase()} ${config.url}`
        );
      }
    }

    if (__DEV__) {
      console.log("[API CONFIG]", {
        rawEnv: RAW_API_URL,
        baseURL: BASE_URL,
      });

      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
      );
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] ✓ ${response.status} ${response.config.url}`);
    }

    return response;
  },
  async (error: AxiosError<any>) => {
    const silent = isExpectedSilentError(error);

    if (__DEV__ && !silent) {
      console.error("[API ERROR]", {
        url: `${error.config?.baseURL ?? ""}${error.config?.url ?? ""}`,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    if (error.response?.status === 401) {
      const { token } = useAuthStore.getState();

      const isAuthEndpoint =
        error.config?.url?.includes("/login") ||
        error.config?.url?.includes("/register");

      if (token && !isAuthEndpoint) {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;