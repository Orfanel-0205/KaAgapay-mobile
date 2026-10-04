// screens/auth/ForgotPasswordScreen.tsx
//
// "Nakalimutan ang password?" from the sign-in screen.
//
// Two steps: the mobile number or email on the account, then the code that
// was sent to it together with a new password. The code goes by SMS to the
// account's number, and by email when the account has one.
//
// The first step always moves on to the second: the server answers the same
// way whether or not an account matched, so this screen cannot be used to
// check whether someone is registered at the RHU, and it must not hint at it.

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { AxiosError } from "axios";

import KeyboardSafeView from "../../Components/KeyboardSafeView";
import {
  requestPasswordReset,
  resendResetCode,
  resetErrorMessage,
  resetPassword,
} from "../../hooks/useAuth";

const INPUT =
  "border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ login?: string }>();

  const [login, setLogin] = useState(typeof params.login === "string" ? params.login : "");
  const [challenge, setChallenge] = useState("");

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!challenge || resendIn <= 0) return;

    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [challenge, resendIn]);

  const backToSignIn = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(auth)/login");
  };

  const startOver = () => {
    setChallenge("");
    setCode("");
    setPassword("");
    setConfirmation("");
    setNotice("");
  };

  const handleRequest = async () => {
    if (!login.trim() || busy) return;

    setBusy(true);

    try {
      const sent = await requestPasswordReset(login.trim());

      setChallenge(sent.challenge);
      setResendIn(sent.resendAfter);
      setNotice(sent.message);
    } catch (err) {
      Alert.alert(
        "Hindi naipadala",
        resetErrorMessage(err, "Hindi naipadala ang request. Tingnan ang internet mo at subukan ulit.")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (busy || code.length !== 6 || !password || !confirmation) return;

    if (password !== confirmation) {
      Alert.alert("Hindi magkapareho", "Hindi magkapareho ang dalawang password na inilagay mo.");
      return;
    }

    setBusy(true);

    try {
      const message = await resetPassword({
        challenge,
        code,
        password,
        password_confirmation: confirmation,
      });

      Alert.alert("Napalitan na ang password", message, [{ text: "Mag-sign in", onPress: backToSignIn }]);
    } catch (err) {
      const data = (err as AxiosError<any>).response?.data;
      const message = resetErrorMessage(err, "Hindi napalitan ang password. Subukan ulit.");

      if (data?.restart) {
        startOver();
        Alert.alert("Magsimula ulit", message);
      } else {
        // A wrong code is typed again; a refused password is retyped.
        if (data?.attempts_left !== undefined) setCode("");
        Alert.alert("Hindi napalitan", message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!challenge || resendIn > 0) return;

    try {
      const sent = await resendResetCode(challenge);
      setResendIn(sent.resendAfter);
      setCode("");
      Alert.alert("Bagong code", sent.message);
    } catch (err) {
      const data = (err as AxiosError<any>).response?.data;

      if (data?.restart) startOver();
      Alert.alert("Hindi naipadala", resetErrorMessage(err, "Hindi naipadala ang bagong code. Subukan ulit mamaya."));
    }
  };

  const canReset = !busy && code.length === 6 && password.length > 0 && confirmation.length > 0;

  return (
    <KeyboardSafeView style={{ backgroundColor: "#FFFFFF" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* HEADER */}
        <View className="bg-teal-600 px-6 pt-20 pb-12 rounded-b-3xl">
          <Text className="text-white text-4xl font-bold">Ka-Agapay</Text>
          <Text className="text-teal-100 text-sm">I-reset ang password mo</Text>
        </View>

        {!challenge ? (
          <View className="px-6 pt-8">
            <Text className="text-xl font-bold mb-2">Nakalimutan ang password?</Text>

            <Text className="text-sm text-gray-600 mb-4 leading-5">
              Ilagay ang mobile number o email ng account mo. Magpapadala kami ng 6-digit code sa
              mobile number nito, at sa email kung mayroon.
            </Text>

            <TextInput
              placeholder="Mobile number o email"
              className={INPUT}
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              autoFocus
            />

            <TouchableOpacity
              onPress={handleRequest}
              disabled={busy || !login.trim()}
              className={`rounded-xl py-4 items-center mt-1 ${
                busy || !login.trim() ? "bg-teal-300" : "bg-teal-600"
              }`}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Ipadala ang code</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToSignIn} className="mt-4">
              <Text className="text-teal-600 text-center text-sm font-semibold">Bumalik sa Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-6 pt-8">
            <Text className="text-xl font-bold mb-2">Ilagay ang code at bagong password</Text>

            {notice ? <Text className="text-sm text-gray-600 mb-3 leading-5">{notice}</Text> : null}

            {/*
                What was typed, shown back. The reply is the same whether or
                not an account matched, so a mistyped or old number would
                otherwise just mean a code that never comes, with no clue
                why. Repeating the resident's own input reveals nothing.
            */}
            <View className="flex-row flex-wrap items-center mb-4">
              <Text className="text-sm text-gray-700">
                Para sa: <Text className="font-bold">{login.trim()}</Text>{"  "}
              </Text>
              <TouchableOpacity onPress={startOver}>
                <Text className="text-sm font-semibold text-teal-600 underline">Palitan</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="6-digit code"
              className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-lg text-gray-800 mb-3 tracking-widest"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              // Lets iOS and Android offer the code straight from the text.
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              autoFocus
            />

            <View className="relative">
              <TextInput
                placeholder="Bagong password"
                secureTextEntry={!showPassword}
                className={`${INPUT} pr-12`}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
              />

              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-3"
                accessibilityLabel={showPassword ? "Itago ang password" : "Ipakita ang password"}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Ulitin ang bagong password"
              secureTextEntry={!showPassword}
              className={INPUT}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              textContentType="newPassword"
            />

            <Text className="text-xs text-gray-500 mb-4 leading-5">
              Hindi bababa sa 8 characters, may malaking titik, maliit na titik, numero, at simbolo.
              Masa-sign out ang lahat ng device na naka-sign in sa account na ito.
            </Text>

            <TouchableOpacity
              onPress={handleReset}
              disabled={!canReset}
              className={`rounded-xl py-4 items-center ${canReset ? "bg-teal-600" : "bg-teal-300"}`}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Palitan ang password</Text>}
            </TouchableOpacity>

            <View className="flex-row justify-between mt-4">
              <TouchableOpacity onPress={handleResend} disabled={resendIn > 0}>
                <Text className={`text-sm font-semibold ${resendIn > 0 ? "text-gray-400" : "text-teal-600"}`}>
                  {resendIn > 0 ? `Bagong code sa ${resendIn}s` : "Magpadala ng bagong code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={backToSignIn}>
                <Text className="text-sm font-semibold text-teal-600">Bumalik</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mt-6 leading-5">
              Walang dumating na code? Siguraduhing ito ang number o email ng account mo. Kung wala
              pa rin, pumunta sa RHU para ma-reset ang password mo.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardSafeView>
  );
}
