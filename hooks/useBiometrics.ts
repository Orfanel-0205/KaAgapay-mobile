import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { Alert, Platform } from "react-native";
import apiClient from "../services/api/client";

const BIOMETRIC_TOKEN_KEY = "ka-agapay-biometric-token";

/**
 * Backend must return a raw 64-character biometric exchange token.
 * This is NOT the normal Sanctum session token.
 */
const BIOMETRIC_TOKEN_REGEX = /^[A-Za-z0-9]{64}$/;

type EnableBiometricResponse = {
  biometric_token?: string;
  token?: string;
  data?: {
    biometric_token?: string;
    token?: string;
  };
};

function extractBiometricToken(payload: EnableBiometricResponse): string | null {
  return (
    payload?.biometric_token ||
    payload?.token ||
    payload?.data?.biometric_token ||
    payload?.data?.token ||
    null
  );
}

function isValidBiometricToken(token: string): boolean {
  return BIOMETRIC_TOKEN_REGEX.test(token);
}

export async function clearSavedBiometricToken(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
}

export function useBiometrics() {
  const isAvailable = async (): Promise<boolean> => {
    return await LocalAuthentication.hasHardwareAsync();
  };

  const isEnrolled = async (): Promise<boolean> => {
    return await LocalAuthentication.isEnrolledAsync();
  };

  const authenticate = async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        Platform.OS === "ios"
          ? "Authenticate with Face ID"
          : "Authenticate with Fingerprint",
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    return result.success;
  };

  const enableBiometrics = async (): Promise<void> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();

    if (!compatible) {
      throw new Error("This device does not support biometric authentication.");
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!enrolled) {
      Alert.alert(
        "No Biometrics Registered",
        "Please register your fingerprint or Face ID in your device settings first.",
        [
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable biometric login for Ka-Agapay",
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error("Biometric authentication failed.");
    }

    // Remove old invalid biometric token first.
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);

    const res = await apiClient.post<EnableBiometricResponse>(
      "/biometric/enable"
    );

    const token = extractBiometricToken(res.data);

    if (typeof token !== "string" || !isValidBiometricToken(token)) {
      if (__DEV__) {
        console.log("[BIOMETRIC ENABLE INVALID RESPONSE]", {
          response: res.data,
          token_length: typeof token === "string" ? token.length : 0,
          token_preview: typeof token === "string" ? token.slice(0, 12) : null,
        });
      }

      throw new Error(
        "Backend returned an invalid biometric token. It must be exactly 64 characters."
      );
    }

    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
      requireAuthentication: false,
    });

    if (__DEV__) {
      console.log("[BIOMETRIC ENABLED]", {
        token_length: token.length,
        token_preview: token.slice(0, 12),
      });
    }
  };

  const disableBiometrics = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);

    try {
      await apiClient.post("/biometric/disable");
    } catch {
      // Ignore server error. Local biometric login is already disabled.
    }
  };

  const loginWithBiometrics = async (): Promise<string | null> => {
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);

    if (typeof token !== "string" || !isValidBiometricToken(token)) {
      if (typeof token === "string") {
        console.log("[BIOMETRIC INVALID STORED TOKEN]", {
          token_length: token.length,
          token_preview: token.slice(0, 12),
        });
      }

      await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      return null;
    }

    const ok = await authenticate();

    if (!ok) {
      return null;
    }

    return token;
  };

  const isBiometricSetUp = async (): Promise<boolean> => {
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);

    if (typeof token !== "string" || !isValidBiometricToken(token)) {
      if (typeof token === "string") {
        await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      }

      return false;
    }

    return true;
  };

  return {
    isAvailable,
    isEnrolled,
    authenticate,
    enableBiometrics,
    disableBiometrics,
    loginWithBiometrics,
    isBiometricSetUp,
  };
}