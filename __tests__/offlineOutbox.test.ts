// __tests__/offlineOutbox.test.ts
//
// What a resident sends with no signal is kept and sent later (Nov 2026,
// services/offlineOutbox).
//
//   - no answer at all: the request is kept under the signed-in account with
//     its own Idempotency-Key, and the screen is told so instead of failing
//   - an answer from the server is thrown as before and nothing is kept
//   - a booking keeps the health profile update first, then the booking
//   - sending later uses the same key, removes what was accepted, keeps what
//     was refused with the reason, and stops at a server error
//   - another account's items are never sent under this one

const mockRequest = jest.fn();
let mockUserId: number | null = 6;

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../services/api/client", () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockRequest(...args),
    interceptors: { response: { use: jest.fn() } },
  },
}));

jest.mock("../store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({ user: mockUserId == null ? null : { user_id: mockUserId } }),
    subscribe: jest.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { keepBookingForLater } from "../services/api/appointments";
import { flushOutbox, IDEMPOTENCY_HEADER, sendOrQueue } from "../services/offlineOutbox";

const KEY = "kaagapay.outbox.v1";

async function kept(): Promise<any[]> {
  return JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
}

const noAnswer = () => Object.assign(new Error("Network Error"), { isAxiosError: true, config: {}, code: "ERR_NETWORK" });
const answered = (status: number, message = "Refused") =>
  Object.assign(new Error(message), { isAxiosError: true, config: {}, response: { status, data: { message } } });

beforeEach(async () => {
  mockRequest.mockReset();
  mockUserId = 6;
  await AsyncStorage.clear();
});

test("with signal it sends straight away, with a key", async () => {
  mockRequest.mockResolvedValueOnce({ data: { ok: true } });

  const result = await sendOrQueue({ method: "post", url: "/feedback", data: { a: 1 }, label: "Health follow-up" });

  expect(result).toEqual({ queued: false, data: { ok: true } });
  expect(mockRequest.mock.calls[0][0].headers[IDEMPOTENCY_HEADER]).toMatch(/^outbox-/);
  expect(await kept()).toHaveLength(0);
});

test("with no answer it keeps the request under this account", async () => {
  mockRequest.mockRejectedValueOnce(noAnswer());

  const result = await sendOrQueue({ method: "post", url: "/programs/4/register", label: "Event: Libreng Bakuna" });

  expect(result.queued).toBe(true);
  expect(await kept()).toMatchObject([{ userId: "6", url: "/programs/4/register", status: "waiting" }]);
});

test("a server's answer is thrown as before and nothing is kept", async () => {
  mockRequest.mockRejectedValueOnce(answered(422, "Puno na ang event."));

  await expect(sendOrQueue({ method: "post", url: "/programs/4/register", label: "x" })).rejects.toThrow("Puno na ang event.");
  expect(await kept()).toHaveLength(0);
});

test("a booking keeps the profile update first, then the booking", async () => {
  await keepBookingForLater(
    { consultation_type: "general", rhu_id: 1, reason: "Ubo at sipon", preferred_date: "2026-11-12", preferred_time: "09:00" } as any,
    { allergies: "None" }
  );

  expect((await kept()).map((item) => [item.method, item.url])).toEqual([
    ["patch", "/profile"],
    ["post", "/appointments"],
  ]);
  expect((await kept())[1].data).toMatchObject({ preferred_date: "2026-11-12", rhu_id: 1 });
});

test("sending later reuses each key, removes the accepted, keeps the refused with the reason", async () => {
  mockRequest.mockRejectedValue(noAnswer());
  await sendOrQueue({ method: "post", url: "/a", label: "A" });
  await sendOrQueue({ method: "post", url: "/b", label: "B" });
  await sendOrQueue({ method: "post", url: "/c", label: "C" });
  const keys = (await kept()).map((item) => item.id);

  mockRequest.mockReset();
  mockRequest
    .mockResolvedValueOnce({ data: {} })
    .mockRejectedValueOnce(answered(422, "Wala nang bakanteng oras."))
    .mockResolvedValueOnce({ data: {} });

  expect(await flushOutbox()).toBe(2);
  expect(mockRequest.mock.calls.map((call) => call[0].headers[IDEMPOTENCY_HEADER])).toEqual(keys);
  expect(await kept()).toMatchObject([{ label: "B", status: "refused", error: "Wala nang bakanteng oras." }]);
});

test("a server error stops sending and keeps the rest in order", async () => {
  mockRequest.mockRejectedValue(noAnswer());
  await sendOrQueue({ method: "post", url: "/a", label: "A" });
  await sendOrQueue({ method: "post", url: "/b", label: "B" });

  mockRequest.mockReset();
  mockRequest.mockRejectedValueOnce(answered(503));

  expect(await flushOutbox()).toBe(0);
  expect((await kept()).map((item) => [item.label, item.status])).toEqual([
    ["A", "waiting"],
    ["B", "waiting"],
  ]);
});

test("another account's items are never sent", async () => {
  mockRequest.mockRejectedValue(noAnswer());
  await sendOrQueue({ method: "post", url: "/a", label: "A" });

  mockUserId = 99;
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({ data: {} });

  expect(await flushOutbox()).toBe(0);
  expect(mockRequest).not.toHaveBeenCalled();
  expect(await kept()).toHaveLength(1);
});
