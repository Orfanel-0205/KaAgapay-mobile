// screens/auth/LoginScreen.tsx
// FIXES APPLIED:
//   ✅ BUG 1 — Biometric 401 after logout
//        • handleBiometricLogin now calls POST /biometric/login with the token
//          in the request body instead of using it as a Bearer token for GET /me.
//        • The server's AuthController::biometricLogin() validates the token via
//          BiometricAuthService and returns a FRESH session token + user object.
//        • This means the biometric credential stored in SecureStore is only
//          ever used as an exchange key, never as a live session token.
//        • The stored biometric token can survive logout because logout only
//          deletes the current session token.
//   ✅ UI CHANGE
//        • Applied Ionicons biometric button UI.
//        • Uses Face ID icon for iOS and fingerprint icon for Android.

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import { AxiosError } from "axios";

import apiClient from "../../services/api/client";
import { useLogin } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/useAuthStore";
import type { User } from "../../store/useAuthStore";
import { useBiometrics } from "../../hooks/useBiometrics";
import { logActivity } from "../../services/api/logs";
import { ApiError } from "../../types/api";

export default function LoginScreen() {
  const router = useRouter();

  const { mutate: login, isPending } = useLogin();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // ─────────────────────────────────────────────
  // Biometrics
  // ─────────────────────────────────────────────

  const { loginWithBiometrics, isBiometricSetUp, isAvailable } =
    useBiometrics();

  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const available = await isAvailable();
        const setupDone = await isBiometricSetUp();

        if (mounted) {
          setBiometricReady(available && setupDone);
        }
      } catch (error) {
        console.log("[BIOMETRIC INIT ERROR]", error);

        if (mounted) {
          setBiometricReady(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ─────────────────────────────────────────────
  // Password Login
  // ─────────────────────────────────────────────

  const handleLogin = () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert(
        "Kulang ang impormasyon",
        "Pakiusap punan ang lahat ng field."
      );
      return;
    }

    login(
      {
        mobile_number: phone.trim(),
        password,
      },
      {
        onSuccess: async () => {
          const { token, user } = useAuthStore.getState();

          console.log(
            "[LOGIN TOKEN]",
            token ? token.slice(0, 20) + "..." : "NULL"
          );
          console.log("[LOGIN USER]", user?.user_id);

          await logActivity("LOGIN", { method: "mobile_password" });

          router.replace("/(tabs)/home");
        },

        onError: (err) => {
          const axiosErr = err as AxiosError<ApiError>;
          const data = axiosErr.response?.data;

          const msg = data?.errors
            ? Object.values(data.errors).flat().join("\n")
            : data?.message ?? "Invalid credentials.";

          Alert.alert("Login Failed", msg);
        },
      }
    );
  };

  // ─────────────────────────────────────────────
  // Biometric Login
  // ─────────────────────────────────────────────
  //
  // FIX:
  // Previously, the app used the biometric token directly as a Bearer token
  // for GET /me. That can cause 401 after logout or after re-enabling
  // biometrics because the stored SecureStore token may no longer match an
  // active Sanctum session token.
  //
  // Correct flow:
  //   1. Read biometric exchange token from SecureStore.
  //   2. Ask OS for biometric verification.
  //   3. POST the raw biometric token to /biometric/login.
  //   4. Backend validates it using BiometricAuthService.
  //   5. Backend returns a fresh session token + user object.
  //   6. App stores the fresh session token in Zustand auth store.

  const handleBiometricLogin = async () => {
    try {
      const storedToken = await loginWithBiometrics();

      console.log(
        "[BIO TOKEN]",
        storedToken ? storedToken.slice(0, 12) + "..." : "NULL"
      );

      if (!storedToken) {
        Alert.alert(
          "Biometric Failed",
          "No biometric token found. Please log in with your password and re-enable biometrics."
        );
        return;
      }

      const res = await apiClient.post<{
        user: User;
        token: string;
        message: string;
      }>("/biometric/login", {
        biometric_token: storedToken,
      });

      console.log("[BIO LOGIN SUCCESS]", {
        user_id: res.data.user?.user_id,
        token_prefix: res.data.token?.slice(0, 15),
      });

      setAuth(res.data.user, res.data.token);

      await logActivity("LOGIN", { method: "biometric" });

      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.log("[BIO LOGIN ERROR]", error?.response?.data || error);
      console.log("[BIO LOGIN STATUS]", error?.response?.status);

      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 401) {
        Alert.alert(
          "Biometric Login Failed",
          "Your biometric session has expired. Please log in with your password and re-enable biometrics in your Profile settings."
        );
      } else if (status === 429) {
        Alert.alert(
          "Too Many Attempts",
          message ?? "Too many biometric attempts. Please use your password."
        );
      } else {
        Alert.alert(
          "Biometric Login Failed",
          message ?? "Something went wrong. Please sign in manually."
        );
      }
    }
  };

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* HEADER */}
        <View className="bg-teal-600 px-6 pt-20 pb-12 rounded-b-3xl">
          <Text className="text-white text-4xl font-bold">Ka-Agapay</Text>

          <Text className="text-teal-100 text-sm">
            Ang iyong kaagapay sa kalusugan
          </Text>
        </View>

        {/* FORM */}
        <View className="px-6 pt-8">
          <Text className="text-xl font-bold mb-4">Mag-sign in</Text>

          <TextInput
            placeholder="Mobile Number (09XXXXXXXXX)"
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            placeholder="Password"
            secureTextEntry
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-4"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isPending}
            className={`rounded-xl py-4 items-center ${
              isPending ? "bg-teal-300" : "bg-teal-600"
            }`}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* BIOMETRIC BUTTON */}
          {biometricReady && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              className="mt-3 border border-teal-200 rounded-xl py-4 items-center flex-row justify-center gap-2"
            >
              <Ionicons
                name={Platform.OS === "ios" ? "scan" : "finger-print"}
                size={26}
                color="#0D9488"
              />

              <Text className="text-teal-600 font-semibold">
                {Platform.OS === "ios"
                  ? "Login with Face ID"
                  : "Login with Fingerprint"}
              </Text>
            </TouchableOpacity>
          )}

          {/* REGISTER */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            className="mt-4"
          >
            <Text className="text-teal-600 text-center text-sm">
              Wala pang account?{" "}
              <Text className="font-bold">Mag-register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

