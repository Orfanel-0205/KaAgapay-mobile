/// <reference types="jest" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/duckOverlay.test.ts
//
// When Doctor Quack appears on the phone, and when he must not.
//
// The sign-in screens get 403s that are not refusals -- "pending approval",
// "enter the code" -- and explain them themselves, so the duck only answers
// something a signed-in resident just did. Background loads that fail must
// not cover the screen either; maintenance always shows.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { AxiosError, AxiosHeaders } from "axios";
import apiClient from "../services/api/client";
import { onDuck } from "../services/api/duckBus";
import { useAuthStore } from "../store/useAuthStore";

let ducks: { kind: string; message?: string }[] = [];
let stop: () => void = () => {};

beforeEach(() => {
  ducks = [];
  stop();
  stop = onDuck((event) => ducks.push(event));
  useAuthStore.setState({ token: "signed-in-token" } as any);
});

function failWith(status: number, data: unknown) {
  apiClient.defaults.adapter = async (config) => {
    throw new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", config, null, {
      status,
      statusText: "",
      data,
      headers: {},
      config: { ...config, headers: config.headers ?? new AxiosHeaders() },
    });
  };
}

describe("Doctor Quack on the phone", () => {
  it("shows the 403 duck with the server's reason for a refused action", async () => {
    failWith(403, { message: "This appointment can no longer be cancelled." });

    await apiClient.post("/appointments/5/cancel").catch(() => {});

    expect(ducks).toEqual([{ kind: "forbidden", message: "This appointment can no longer be cancelled." }]);
  });

  it("stays out of the sign-in screens", async () => {
    useAuthStore.setState({ token: null } as any);
    failWith(403, { message: "Your account is pending Super Admin approval." });

    await apiClient.post("/login", {}).catch(() => {});

    expect(ducks).toEqual([]);
  });

  it("does not treat the sign-in code step as a refusal", async () => {
    failWith(403, { code_required: true, challenge: "x" });

    await apiClient.post("/login", {}).catch(() => {});

    expect(ducks).toEqual([]);
  });

  it("shows the 500 duck when the server breaks during an action", async () => {
    failWith(500, {});

    await apiClient.post("/appointments", {}).catch(() => {});

    expect(ducks.map((d) => d.kind)).toEqual(["server_error"]);
  });

  it("does not pop up for a failed background load", async () => {
    failWith(500, {});

    await apiClient.get("/notifications").catch(() => {});

    expect(ducks).toEqual([]);
  });

  it("shows maintenance for any request", async () => {
    failWith(503, { message: "Service Unavailable" });

    await apiClient.get("/announcements").catch(() => {});

    expect(ducks.map((d) => d.kind)).toEqual(["maintenance"]);
  });
});
