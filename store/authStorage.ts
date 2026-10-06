// store/authStorage.ts
//
// WHERE THE SIGNED-IN SESSION IS KEPT BETWEEN LAUNCHES.
//
// The sign-in token goes to SecureStore: the phone's keystore, encrypted and
// left out of Google's automatic app-data backup. The rest of the session --
// the profile shown on screen -- stays in AsyncStorage, as before.
//
// Until October 2026 the whole session, token included, was plain JSON in
// AsyncStorage. Other apps cannot read that, but a backup, a rooted phone or
// a debugging cable could, and the token is the account. An install from
// before this change still has its token there: the first launch moves it to
// SecureStore and removes it from AsyncStorage, so nobody is signed out.
//
// Everything in the app reads the token from the in-memory store
// (useAuthStore.getState().token); only this file knows where it is saved.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

export const TOKEN_KEY = "ka-agapay-auth-token";

/** The token last written to SecureStore, so unrelated saves do not rewrite it. */
let savedToken: string | null | undefined;

type Persisted = { state?: Record<string, unknown> & { token?: string | null }; version?: number };

function parse(raw: string | null): Persisted | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Save or clear the token. False if the keystore refused. */
async function writeToken(token: string | null): Promise<boolean> {
  if (token === savedToken) return true;

  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    savedToken = token;
    return true;
  } catch {
    return false;
  }
}

export const authStorage: StateStorage = {
  async getItem(name) {
    const persisted = parse(await AsyncStorage.getItem(name));
    let token = await readToken();
    savedToken = token;

    if (!persisted?.state) return null;

    // An install from before this change: move its token over.
    const legacy = persisted.state.token ?? null;

    if (legacy) {
      if (!token && (await writeToken(legacy))) {
        token = legacy;
      }

      if (token === legacy) {
        await AsyncStorage.setItem(name, JSON.stringify({ ...persisted, state: { ...persisted.state, token: null } }));
      }
    }

    return JSON.stringify({ ...persisted, state: { ...persisted.state, token: token ?? legacy } });
  },

  async setItem(name, value) {
    const persisted = parse(value);

    if (!persisted?.state) {
      await AsyncStorage.setItem(name, value);
      return;
    }

    const token = persisted.state.token ?? null;

    // If the keystore refuses (rare: a damaged or locked keystore), keep the
    // token where it always was rather than sign the person out.
    const secured = await writeToken(token);

    await AsyncStorage.setItem(
      name,
      JSON.stringify({ ...persisted, state: { ...persisted.state, token: secured ? null : token } })
    );
  },

  async removeItem(name) {
    await writeToken(null);
    await AsyncStorage.removeItem(name);
  },
};

/** For tests: forget what this module thinks is saved. */
export function resetAuthStorageCache(): void {
  savedToken = undefined;
}
