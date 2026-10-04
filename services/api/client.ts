// services/api/client.ts

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { ensureHydration, useAuthStore } from "../../store/useAuthStore";
import { emitDuck } from "./duckBus";

function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.51.37:8000";

const API_ORIGIN = cleanUrl(RAW_API_URL);

const BASE_URL = API_ORIGIN.endsWith("/api/v1")
  ? API_ORIGIN
  : `${API_ORIGIN}/api/v1`;

/** The API root, e.g. for the maintenance screen's health check. */
export const API_BASE_URL = BASE_URL;

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

    // Doctor Quack (Components/DuckOverlay.tsx). Maintenance shows for every
    // request; a refusal or a server failure only for something the signed-in
    // resident just did -- not for background loads, and not on the sign-in
    // screens, where a 403 means "pending approval" or "enter the code" and
    // those screens explain it themselves.
    const status = error.response?.status ?? 0;
    const method = String(error.config?.method ?? "get").toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(method);
    const signedIn = Boolean(error.config?.headers?.Authorization);

    if (status === 503) {
      emitDuck({ kind: "maintenance" });
    } else if (!silent && isMutation && signedIn) {
      if (status === 403 && !error.response?.data?.code_required) {
        emitDuck({ kind: "forbidden", message: error.response?.data?.message });
      } else if (status >= 500) {
        emitDuck({ kind: "server_error" });
      }
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