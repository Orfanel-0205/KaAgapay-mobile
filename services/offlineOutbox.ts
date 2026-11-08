// services/offlineOutbox.ts
//
// WHAT A RESIDENT SENDS WITH NO SIGNAL IS KEPT, AND SENT WHEN IT RETURNS
// (Nov 2026).
//
// A booking, an event sign-up or a health follow-up made where the signal
// drops is kept on the phone with its own Idempotency-Key and sent again
// when a request gets through: when the app comes back to the front, every
// 30 seconds while anything waits, and after any successful request. The
// server does a resent request once (IdempotentRequests), so a reply lost on
// the way back cannot book twice.
//
// Kept items belong to the account that made them and are only sent under
// it. One the server refuses when it is finally sent (the slot was taken,
// the event is full) is kept with the reason and shown in the banner, never
// dropped silently. Sent items are deleted at once.
//
// There is no network library here on purpose: a request that gets no
// answer means offline, and one that gets any answer means online. That
// needs no native module, so it ships without a new build of the app shell.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import apiClient from "./api/client";
import { useAuthStore } from "../store/useAuthStore";

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

const STORAGE_KEY = "kaagapay.outbox.v1";
const RETRY_EVERY_MS = 30_000;

export type OutboxMethod = "post" | "put" | "patch";

export type OutboxItem = {
  /** Also the Idempotency-Key the server sees on every attempt. */
  id: string;
  userId: string;
  method: OutboxMethod;
  url: string;
  data: unknown;
  /** What the banner shows, e.g. "Booking: Nov 12". */
  label: string;
  createdAt: string;
  attempts: number;
  status: "waiting" | "refused";
  error?: string;
};

export type SendResult<T> = { queued: false; data: T } | { queued: true; item: OutboxItem };

// ---------------------------------------------------------------- storage

async function readAll(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: OutboxItem[]): Promise<void> {
  try {
    if (items.length) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage full: the save already failed and the resident was told.
  }
  await refresh();
}

export function currentUserId(): string | null {
  const id = useAuthStore.getState().user?.user_id;
  return id != null ? String(id) : null;
}

function newKey(): string {
  const cryptoApi: any = (globalThis as any).crypto;
  const random =
    cryptoApi && typeof cryptoApi.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `outbox-${random}`;
}

// ---------------------------------------------------------------- state for the banner

type Snapshot = { online: boolean; items: OutboxItem[] };
type Listener = () => void;

const listeners = new Set<Listener>();
let snapshot: Snapshot = { online: true, items: [] };

async function refresh(): Promise<void> {
  const me = currentUserId();
  const items = me ? (await readAll()).filter((item) => item.userId === me) : [];
  snapshot = { ...snapshot, items };
  listeners.forEach((listener) => listener());
}

function setOnline(online: boolean): void {
  if (snapshot.online === online) return;
  snapshot = { ...snapshot, online };
  listeners.forEach((listener) => listener());
}

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOutboxSnapshot(): Snapshot {
  return snapshot;
}

// ---------------------------------------------------------------- sending

/** No answer at all: no signal, airplane mode, a dropped connection or a timeout. */
export function isConnectionFailure(error: any): boolean {
  if (error?.code === "ERR_CANCELED") return false;
  return Boolean(error?.isAxiosError || error?.config) && !error?.response;
}

/** Keep a request to send later, without trying it now. */
export async function keepForLater(request: {
  method: OutboxMethod;
  url: string;
  data?: unknown;
  label: string;
}): Promise<OutboxItem> {
  const userId = currentUserId();
  if (!userId) throw new Error("Please sign in again.");

  const item: OutboxItem = {
    id: newKey(),
    userId,
    method: request.method,
    url: request.url,
    data: request.data ?? null,
    label: request.label,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "waiting",
  };
  await writeAll([...(await readAll()), item]);
  setOnline(false);
  return item;
}

/**
 * Send now, or keep it for later when there is no answer at all. Errors the
 * server answers (a validation error, a refusal) are thrown as before, for
 * the screen to show.
 */
export async function sendOrQueue<T = any>(request: {
  method: OutboxMethod;
  url: string;
  data?: unknown;
  label: string;
}): Promise<SendResult<T>> {
  const id = newKey();

  try {
    const res = await apiClient.request<T>({
      method: request.method,
      url: request.url,
      data: request.data,
      headers: { [IDEMPOTENCY_HEADER]: id },
    });
    return { queued: false, data: res.data };
  } catch (error) {
    if (!isConnectionFailure(error)) throw error;
    const item = await keepForLater(request);
    return { queued: true, item };
  }
}

let flushing = false;

/** Send every waiting item of the signed-in account, oldest first. */
export async function flushOutbox(): Promise<number> {
  const me = currentUserId();
  if (flushing || !me) return 0;

  flushing = true;
  let sent = 0;

  try {
    for (const item of (await readAll()).filter((entry) => entry.userId === me && entry.status === "waiting")) {
      try {
        await apiClient.request({
          method: item.method,
          url: item.url,
          data: item.data,
          headers: { [IDEMPOTENCY_HEADER]: item.id },
        });
        await writeAll((await readAll()).filter((entry) => entry.id !== item.id));
        sent++;
      } catch (error: any) {
        const status = error?.response?.status ?? 0;

        // Still no signal, signed out, busy or broken: try again later, in order.
        if (isConnectionFailure(error) || status === 401 || status === 409 || status === 429 || status >= 500) {
          await writeAll(
            (await readAll()).map((entry) => (entry.id === item.id ? { ...entry, attempts: entry.attempts + 1 } : entry))
          );
          break;
        }

        // The RHU's server looked at it and said no: keep it for the resident to see.
        const message = String(error?.response?.data?.message || "The RHU did not accept it.");
        await writeAll(
          (await readAll()).map((entry) =>
            entry.id === item.id ? { ...entry, status: "refused", attempts: entry.attempts + 1, error: message } : entry
          )
        );
      }
    }
  } finally {
    flushing = false;
  }

  await refresh();
  return sent;
}

export async function discardOutboxItem(id: string): Promise<void> {
  await writeAll((await readAll()).filter((entry) => entry.id !== id));
}

export async function discardRefused(): Promise<void> {
  const me = currentUserId();
  await writeAll((await readAll()).filter((entry) => !(entry.userId === me && entry.status === "refused")));
}

// ---------------------------------------------------------------- automatic sending

let started = false;

/** Called once by the root layout. Safe to call again. */
export function startOutbox(): void {
  if (started) return;
  started = true;

  // Every request tells the banner whether the phone is online, and the
  // first one that gets through after a gap sends what was kept.
  apiClient.interceptors.response.use(
    (response) => {
      const wasOffline = !snapshot.online;
      setOnline(true);
      if (wasOffline && snapshot.items.some((item) => item.status === "waiting")) void flushOutbox();
      return response;
    },
    (error) => {
      if (isConnectionFailure(error)) setOnline(false);
      else if (error?.response) setOnline(true);
      return Promise.reject(error);
    }
  );

  AppState.addEventListener("change", (state) => {
    if (state === "active") void flushOutbox();
  });

  setInterval(() => {
    if (snapshot.items.some((item) => item.status === "waiting")) void flushOutbox();
  }, RETRY_EVERY_MS);

  // Signing in as someone else shows that account's items, not the last one's.
  useAuthStore.subscribe(() => void refresh());

  void refresh().then(() => flushOutbox());
}
