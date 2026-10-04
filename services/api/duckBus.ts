// services/api/duckBus.ts
//
// How the API client asks for Doctor Quack.
//
//   forbidden     403  the account cannot do this
//   server_error  5xx  the server broke, not the resident
//   maintenance   503  the whole system is down for an update
//
// client.ts emits; Components/DuckOverlay.tsx listens and draws. Kept apart
// so the API layer never imports React.

export type DuckKind = "forbidden" | "server_error" | "maintenance";

export interface DuckEvent {
  kind: DuckKind;
  /** The server's own explanation, when it gave one. */
  message?: string;
}

type Listener = (event: DuckEvent) => void;

const listeners = new Set<Listener>();

export function onDuck(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Returns false when nothing is listening, so nothing is assumed shown. */
export function emitDuck(event: DuckEvent): boolean {
  if (listeners.size === 0) return false;

  listeners.forEach((listener) => listener(event));
  return true;
}
