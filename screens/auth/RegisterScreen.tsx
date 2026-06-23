
// screens/auth/RegisterScreen.tsx
// MAIN LOGIC + UI CHANGES APPLIED
//
// UI CHANGES APPLIED:
//   ✅ Added Ionicons import
//   ✅ Back button now uses chevron icon
//   ✅ Profile photo placeholder now uses camera icon
//   ✅ Profile photo add button now uses add icon
//   ✅ Birthday field now uses calendar icon
//   ✅ Password requirement list now uses checkmark-circle / ellipse-outline icons
//   ✅ Barangay modal close button now uses close icon
//   ✅ Birthday picker text sizes updated from UI version
//
// MAIN LOGIC PRESERVED:
//   ✅ Registration submit logic
//   ✅ Barangay API loading and validation
//   ✅ Birthday picker logic
//   ✅ Password strength validation
//   ✅ Profile picture picker and upload
//   ✅ Auth store update after avatar upload
//   ✅ Activity logging after registration

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { AxiosError } from "axios";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { useRegister } from "../../hooks/useAuth";
import { useBarangays } from "../../hooks/useBarangays";
import { usePasswordStrength, RULES } from "../../hooks/usePasswordStrength";
import { logActivity } from "../../services/api/logs";
import apiClient from "../../services/api/client";
import { useAuthStore } from "../../store/useAuthStore";
import type { ApiError } from "../../types/api";

// ─── Birthday picker constants ────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Simple Stepper Picker ────────────────────────────────────────────────────

interface StepperProps {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}

function StepperPicker({ label, value, onMinus, onPlus }: StepperProps) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: "#0d9488",
          letterSpacing: 1.2,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>

      <TouchableOpacity
        onPress={onPlus}
        style={{
          width: 42,
          height: 36,
          borderRadius: 12,
          backgroundColor: "#ccfbf1",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "900", color: "#0f766e" }}>
          +
        </Text>
      </TouchableOpacity>

      <View
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 14,
          backgroundColor: "#f0fdfa",
          borderWidth: 1,
          borderColor: "#99f6e4",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
        }}
      >
        <Text
          style={{
            fontSize: 23,
            fontWeight: "900",
            color: "#0f766e",
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onMinus}
        style={{
          width: 42,
          height: 36,
          borderRadius: 12,
          backgroundColor: "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "900", color: "#374151" }}>
          −
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Birthday Modal ───────────────────────────────────────────────────────────

interface BirthdayPickerModalProps {
  visible: boolean;
  initialDate: Date | null;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

function BirthdayPickerModal({
  visible,
  initialDate,
  onConfirm,
  onClose,
}: BirthdayPickerModalProps) {
  const defaultDate = new Date(1998, 0, 1);

  const [year, setYear] = useState(
    (initialDate ?? defaultDate).getFullYear()
  );
  const [monthIndex, setMonthIndex] = useState(
    (initialDate ?? defaultDate).getMonth()
  );
  const [day, setDay] = useState((initialDate ?? defaultDate).getDate());

  useEffect(() => {
    if (!visible) return;

    const d = initialDate ?? defaultDate;

    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
    setDay(d.getDate());
  }, [visible, initialDate]);

  useEffect(() => {
    const maxDay = getDaysInMonth(year, monthIndex);

    if (day > maxDay) {
      setDay(maxDay);
    }
  }, [year, monthIndex, day]);

  const maxDay = getDaysInMonth(year, monthIndex);
  const safeDay = clampNumber(day, 1, maxDay);

  const increaseYear = () => {
    setYear((prev) => clampNumber(prev + 1, 1900, CURRENT_YEAR));
  };

  const decreaseYear = () => {
    setYear((prev) => clampNumber(prev - 1, 1900, CURRENT_YEAR));
  };

  const increaseMonth = () => {
    setMonthIndex((prev) => {
      if (prev >= 11) return 0;
      return prev + 1;
    });
  };

  const decreaseMonth = () => {
    setMonthIndex((prev) => {
      if (prev <= 0) return 11;
      return prev - 1;
    });
  };

  const increaseDay = () => {
    setDay((prev) => {
      const max = getDaysInMonth(year, monthIndex);
      if (prev >= max) return 1;
      return prev + 1;
    });
  };

  const decreaseDay = () => {
    setDay((prev) => {
      const max = getDaysInMonth(year, monthIndex);
      if (prev <= 1) return max;
      return prev - 1;
    });
  };

  const handleConfirm = () => {
    const selectedDate = new Date(year, monthIndex, safeDay);
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <View
          style={{
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 34 : 22,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: "#6b7280", fontSize: 23 }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 25,
                  color: "#111827",
                }}
              >
                Date of Birth
              </Text>

              <Text style={{ fontSize: 19, color: "#9ca3af", marginTop: 2 }}>
                Tap + or − to select
              </Text>
            </View>

            <TouchableOpacity onPress={handleConfirm}>
              <Text
                style={{
                  color: "#0d9488",
                  fontWeight: "900",
                  fontSize: 23,
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: 18,
            }}
          >
            <StepperPicker
              label="YEAR"
              value={String(year)}
              onPlus={increaseYear}
              onMinus={decreaseYear}
            />

            <StepperPicker
              label="MONTH"
              value={MONTHS[monthIndex]}
              onPlus={increaseMonth}
              onMinus={decreaseMonth}
            />

            <StepperPicker
              label="DAY"
              value={String(safeDay).padStart(2, "0")}
              onPlus={increaseDay}
              onMinus={decreaseDay}
            />
          </View>

          <View
            style={{
              marginHorizontal: 16,
              marginTop: 18,
              backgroundColor: "#f0fdfa",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#0d9488",
                fontWeight: "900",
                fontSize: 25,
              }}
            >
              {MONTHS[monthIndex]} {String(safeDay).padStart(2, "0")}, {year}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const { updateUser } = useAuthStore();

  const {
    barangays,
    isLoading: barangaysLoading,
    isReady: barangaysReady,
  } = useBarangays();

  // ── Form state ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [barangay, setBarangay] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // ── UI toggles ────────────────────────────────────────────────────────────
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Password strength ─────────────────────────────────────────────────────
  const strength = usePasswordStrength(password, firstName, lastName, mobile);

  // ── Derived ───────────────────────────────────────────────────────────────
  const formattedBirthday = birthday
    ? birthday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Select birthday";

  const birthdayISO = birthday ? birthday.toISOString().split("T")[0] : undefined;

  const filteredBarangays = barangaySearch.trim()
    ? barangays.filter((b: string) =>
        b.toLowerCase().includes(barangaySearch.toLowerCase())
      )
    : barangays;

  // ── Pick avatar ───────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow gallery access to add a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    const formData = new FormData();

    formData.append("avatar", {
      uri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);

    try {
      const res = await apiClient.post<{ avatar_url: string }>(
        "/profile/avatar",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      updateUser({
        avatar: res.data.avatar_url,
      });
    } catch (_) {
      // Non-critical. Registration already succeeded.
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleRegister = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !mobile.trim() ||
      !password.trim()
    ) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }

    if (!barangay) {
      Alert.alert("Barangay required", "Please select your barangay.");
      return;
    }

    if (!barangaysReady) {
      Alert.alert(
        "Please wait",
        "Barangay list is still loading. Please try again in a moment."
      );
      return;
    }

    if (!strength.allMet) {
      Alert.alert(
        "Password too weak",
        "Please meet all password requirements:\n\n" +
          strength.errors.join("\n")
      );
      return;
    }

    if (password !== pwConfirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    const cleanBarangay = barangay.trim();

    if (__DEV__) {
      console.log(
        "[REGISTER] barangay value being submitted:",
        JSON.stringify(cleanBarangay)
      );
      console.log(
        "[REGISTER] barangay char codes:",
        [...cleanBarangay].map((c) => c.charCodeAt(0))
      );
      console.log("[REGISTER] barangaysReady:", barangaysReady);
      console.log(
        "[REGISTER] current barangays list first 5:",
        barangays.slice(0, 5)
      );
    }

    register(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        mobile_number: mobile.trim(),
        password,
        password_confirmation: pwConfirm,
        barangay: cleanBarangay,
        birthday: birthdayISO,
        sex: sex || undefined,
      },
      {
        onSuccess: async () => {
          if (avatarUri) {
            await uploadAvatar(avatarUri);
          }

          await logActivity("USER_REGISTERED", {
            method: "mobile_number",
          });

          // PART C: remind the resident to complete their ITR health profile.
          Alert.alert(
            "Account created",
            "Your account was created. Please complete your health profile before booking a consultation.",
            [
              {
                text: "Later",
                style: "cancel",
                onPress: () => router.replace("/(tabs)/home"),
              },
              {
                text: "Complete Profile",
                onPress: () => router.replace("/(tabs)/profile" as any),
              },
            ]
          );
        },

        onError: (err) => {
          const data = (err as AxiosError<ApiError>).response?.data;

          const msg = data?.errors
            ? Object.values(data.errors).flat().join("\n")
            : data?.message ?? "Registration failed.";

          Alert.alert("Registration Failed", msg);
        },
      }
    );
  };

  // ── Password strength bar ─────────────────────────────────────────────────
  const StrengthBar = () => {
    if (!password) return null;

    const segments = 5;

    return (
      <View className="mb-3">
        <View className="flex-row gap-1 mb-1">
          {Array.from({ length: segments }).map((_, i) => (
            <View
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < strength.score ? strength.barColor : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        <Text className={`text-xs ${strength.color}`}>
          Password strength: {strength.label}
        </Text>

        {strength.errors.length > 0 && (
          <View className="mt-1">
            {RULES.map((rule) => {
              const met = rule.test(password);

              return (
                <View key={rule.key} className="flex-row items-center">
                  <Ionicons
                    name={met ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={met ? "#16A34A" : "#9CA3AF"}
                    style={{ marginRight: 4 }}
                  />

                  <Text
                    className={`text-xs ${
                      met ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: "#fff" }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={24}
        extraHeight={120}
      >
        {/* Header */}
        <View className="bg-teal-600 px-6 pt-14 pb-10 rounded-b-3xl">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
          >
            <Ionicons name="chevron-back" size={28} color="#CCFBF1" />
          </TouchableOpacity>

          <Text className="text-white text-3xl font-bold">Create Account</Text>

          <Text className="text-teal-100 text-sm mt-1">
            Join Ka-Agapay — your health companion
          </Text>
        </View>

        <View className="px-6 pt-6 pb-10">
          {/* Profile picture */}
          <View className="items-center mb-6">
            <TouchableOpacity onPress={pickAvatar} className="relative">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-24 h-24 rounded-full border-4 border-teal-100"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-teal-50 border-2 border-teal-200 items-center justify-center">
                  <Ionicons name="camera" size={28} color="#0D9488" />
                </View>
              )}

              <View className="absolute bottom-0 right-0 bg-teal-600 rounded-full w-7 h-7 items-center justify-center">
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text className="text-gray-400 text-xs mt-2">
              Tap to add profile photo (optional)
            </Text>
          </View>

          {/* First Name */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            First Name *
          </Text>
          <TextInput
            placeholder="Juan"
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Last Name */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Last Name *
          </Text>
          <TextInput
            placeholder="dela Cruz"
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Mobile */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Mobile Number *
          </Text>
          <TextInput
            placeholder="09XXXXXXXXX"
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            maxLength={11}
            returnKeyType="next"
          />

          {/* Email */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Email optional
          </Text>
          <TextInput
            placeholder="email@example.com"
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 mb-3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />

          {/* Barangay */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Barangay *
          </Text>
          <TouchableOpacity
            onPress={() => setShowBarangayPicker(true)}
            disabled={barangaysLoading}
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
          >
            <Text
              className={
                barangay ? "text-sm text-gray-800" : "text-sm text-gray-400"
              }
            >
              {barangaysLoading
                ? "Loading barangays…"
                : barangay || "Select your barangay"}
            </Text>

            {barangaysLoading ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <Text className="text-gray-400">▾</Text>
            )}
          </TouchableOpacity>

          {/* Birthday */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Birthday
          </Text>
          <TouchableOpacity
            onPress={() => setShowBirthdayPicker(true)}
            className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between"
          >
            <Text
              className={
                birthday ? "text-sm text-gray-800" : "text-sm text-gray-400"
              }
            >
              {formattedBirthday}
            </Text>

            <Ionicons name="calendar-outline" size={26} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Sex */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Sex
          </Text>
          <View className="flex-row gap-2 mb-3">
            {(["male", "female", "other"] as const).map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setSex(option)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  sex === option
                    ? "bg-teal-600 border-teal-600"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    sex === option ? "text-white" : "text-gray-500"
                  }`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Password */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Password *
          </Text>
          <View className="border border-gray-200 bg-gray-50 rounded-xl flex-row items-center mb-2">
            <TextInput
              placeholder="Min. 8 chars, uppercase, number, symbol"
              secureTextEntry={!showPassword}
              className="flex-1 px-4 py-3 text-sm text-gray-800"
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              className="px-3"
            >
              <Text className="text-gray-400 text-sm">
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <StrengthBar />

          {/* Confirm Password */}
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">
            Confirm Password *
          </Text>
          <View
            className={`border bg-gray-50 rounded-xl flex-row items-center mb-5 ${
              pwConfirm && pwConfirm !== password
                ? "border-red-300"
                : "border-gray-200"
            }`}
          >
            <TextInput
              placeholder="Repeat your password"
              secureTextEntry={!showConfirm}
              className="flex-1 px-4 py-3 text-sm text-gray-800"
              value={pwConfirm}
              onChangeText={setPwConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              className="px-3"
            >
              <Text className="text-gray-400 text-sm">
                {showConfirm ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {pwConfirm.length > 0 && pwConfirm !== password && (
            <Text className="text-red-500 text-xs -mt-4 mb-3 ml-1">
              Passwords do not match.
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isPending || !barangaysReady}
            className={`rounded-xl py-4 items-center ${
              isPending || !barangaysReady ? "bg-teal-300" : "bg-teal-600"
            }`}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-teal-600 text-center text-sm">
              Already have an account?{" "}
              <Text className="font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Barangay picker modal */}
      <Modal
        visible={showBarangayPicker}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: "70%" }}>
            <View className="px-4 pt-4 pb-2">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-800 font-bold text-lg">
                  Select Barangay
                </Text>

                <TouchableOpacity onPress={() => setShowBarangayPicker(false)}>
                  <Ionicons name="close" size={26} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Search barangay..."
                className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-2 text-sm text-gray-800"
                value={barangaySearch}
                onChangeText={setBarangaySearch}
                autoFocus
              />
            </View>

            {barangaysLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#14b8a6" />
                <Text className="text-gray-400 mt-2">Loading barangays…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredBarangays}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setBarangay(item.trim());
                      setShowBarangayPicker(false);
                      setBarangaySearch("");
                    }}
                    className={`px-4 py-4 border-b border-gray-50 ${
                      barangay === item.trim() ? "bg-teal-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        barangay === item.trim()
                          ? "text-teal-600 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Birthday picker modal */}
      <BirthdayPickerModal
        visible={showBirthdayPicker}
        initialDate={birthday}
        onConfirm={setBirthday}
        onClose={() => setShowBirthdayPicker(false)}
      />
    </>
  );
}
