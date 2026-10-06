// __tests__/authStorage.test.ts
//
// The sign-in token is kept in SecureStore, not in plain AsyncStorage
// (store/authStorage.ts), and an install from before that change keeps its
// session: the token is moved, not dropped.

const mockKeystore = new Map<string, string>();
let mockKeystoreBroken = false;

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockKeystore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockKeystoreBroken) throw new Error("keystore unavailable");
    mockKeystore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockKeystore.delete(key);
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { authStorage, resetAuthStorageCache, TOKEN_KEY } from "../store/authStorage";

const NAME = "ka-agapay-auth";
const user = { user_id: 6, first_name: "Maria", mobile_number: "09170000001" };
const session = (token: string | null) => JSON.stringify({ state: { user, token, isAuthenticated: !!token }, version: 0 });

async function plain(): Promise<{ state: { token: string | null; user: unknown } }> {
  return JSON.parse((await AsyncStorage.getItem(NAME)) as string);
}

beforeEach(async () => {
  mockKeystore.clear();
  mockKeystoreBroken = false;
  resetAuthStorageCache();
  await AsyncStorage.clear();
});

test("signing in puts the token in SecureStore and nowhere in AsyncStorage", async () => {
  await authStorage.setItem(NAME, session("12|secret-token"));

  expect(mockKeystore.get(TOKEN_KEY)).toBe("12|secret-token");
  expect((await plain()).state.token).toBeNull();
  expect((await plain()).state.user).toEqual(user);
  expect(await AsyncStorage.getItem(NAME)).not.toContain("secret-token");
});

test("on the next launch the session comes back whole", async () => {
  await authStorage.setItem(NAME, session("12|secret-token"));
  resetAuthStorageCache();

  const restored = JSON.parse((await authStorage.getItem(NAME)) as string);

  expect(restored.state.token).toBe("12|secret-token");
  expect(restored.state.user).toEqual(user);
});

test("an install from before the change is moved over without signing anyone out", async () => {
  // How the old app saved it: everything, token included, in AsyncStorage.
  await AsyncStorage.setItem(NAME, session("7|old-token"));

  const restored = JSON.parse((await authStorage.getItem(NAME)) as string);

  expect(restored.state.token).toBe("7|old-token");
  expect(mockKeystore.get(TOKEN_KEY)).toBe("7|old-token");
  expect((await plain()).state.token).toBeNull();
});

test("signing out clears both places", async () => {
  await authStorage.setItem(NAME, session("12|secret-token"));
  await authStorage.setItem(NAME, session(null));

  expect(mockKeystore.has(TOKEN_KEY)).toBe(false);

  await authStorage.setItem(NAME, session("12|secret-token"));
  await authStorage.removeItem(NAME);

  expect(mockKeystore.has(TOKEN_KEY)).toBe(false);
  expect(await AsyncStorage.getItem(NAME)).toBeNull();
});

test("if the keystore refuses, the token is kept where it was rather than lost", async () => {
  mockKeystoreBroken = true;

  await authStorage.setItem(NAME, session("12|secret-token"));
  resetAuthStorageCache();

  expect((await plain()).state.token).toBe("12|secret-token");
  expect(JSON.parse((await authStorage.getItem(NAME)) as string).state.token).toBe("12|secret-token");
});
