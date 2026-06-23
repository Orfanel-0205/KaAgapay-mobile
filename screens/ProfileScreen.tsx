// screens/ProfileScreen.tsx
// Ka-Agapay Mobile Resident Profile Screen
// Fixed: no raw text strings inside View / TouchableOpacity.
// Adaptive + global language ready.
// Updated: dropdown/select modal for fixed-choice profile fields.

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DraggableChatFAB from "../Components/Draggablechatfab";
import LanguageSwitcher from "../Components/LanguageSwitcher";
import ProfileSelectModal, {
  type ProfileSelectOption,
} from "../Components/ProfileSelectModal";

import apiClient from "../services/api/client";
import { logActivity } from "../services/api/logs";
import { getProfile, updateProfile } from "../services/api/profile";
import { resolveProfileCompletion } from "../utils/profileCompletion";

import { useLogout } from "../hooks/useAuth";
import { useBiometrics } from "../hooks/useBiometrics";
import { useAuthStore } from "../store/useAuthStore";

import { tr, useLang, type Lang } from "../constants/i18n";
import { COLORS, FONTS } from "../constants/theme";
import { resolveAvatarUrl } from "../utils/avatarUrl";
import { useResponsive, type Responsive } from "../utils/responsive";

type EditModalState = {
  visible: boolean;
  field: string;
  key: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
};

type EditModalProps = {
  state: EditModalState;
  lang: Lang;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
};

type SelectModalState = {
  visible: boolean;
  field: string;
  key: string;
  value: string;
  options: ProfileSelectOption[];
  searchable?: boolean;
  loading?: boolean;
};

const SEX_OPTIONS: ProfileSelectOption[] = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const CIVIL_STATUS_OPTIONS: ProfileSelectOption[] = [
  { label: "Single", value: "Single" },
  { label: "Married", value: "Married" },
  { label: "Widowed", value: "Widowed" },
  { label: "Separated", value: "Separated" },
  { label: "Annulled", value: "Annulled" },
  { label: "Live-in", value: "Live-in" },
];

const RELIGION_OPTIONS: ProfileSelectOption[] = [
  { label: "Roman Catholic", value: "Roman Catholic" },
  { label: "Iglesia Ni Cristo", value: "Iglesia Ni Cristo" },
  { label: "Islam", value: "Islam" },
  { label: "Born Again Christian", value: "Born Again Christian" },
  { label: "Protestant", value: "Protestant" },
  { label: "Seventh-day Adventist", value: "Seventh-day Adventist" },
  { label: "Aglipayan", value: "Aglipayan" },
  { label: "Other", value: "Other" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const EDUCATIONAL_ATTAINMENT_OPTIONS: ProfileSelectOption[] = [
  { label: "No formal education", value: "No formal education" },
  { label: "Elementary level", value: "Elementary level" },
  { label: "Elementary graduate", value: "Elementary graduate" },
  { label: "High school level", value: "High school level" },
  { label: "High school graduate", value: "High school graduate" },
  { label: "Senior high school", value: "Senior high school" },
  { label: "Vocational", value: "Vocational" },
  { label: "College level", value: "College level" },
  { label: "College graduate", value: "College graduate" },
  { label: "Postgraduate", value: "Postgraduate" },
];

const CLIENT_TYPE_OPTIONS: ProfileSelectOption[] = [
  { label: "General Patient", value: "General Patient" },
  { label: "Senior Citizen", value: "Senior Citizen" },
  { label: "PWD", value: "PWD" },
  { label: "Pregnant", value: "Pregnant" },
  { label: "Child", value: "Child" },
  { label: "Infant", value: "Infant" },
  { label: "PhilHealth Member", value: "PhilHealth Member" },
  { label: "Indigent", value: "Indigent" },
];

const SMOKING_STATUS_OPTIONS: ProfileSelectOption[] = [
  { label: "Never smoker", value: "Never smoker" },
  { label: "Former smoker", value: "Former smoker" },
  { label: "Current smoker", value: "Current smoker" },
  {
    label: "Secondhand smoke exposure",
    value: "Secondhand smoke exposure",
  },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const ALCOHOL_INTAKE_OPTIONS: ProfileSelectOption[] = [
  { label: "None", value: "None" },
  { label: "Occasional", value: "Occasional" },
  { label: "Moderate", value: "Moderate" },
  { label: "Frequent", value: "Frequent" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

function normalizeOptionText(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueOptions(options: ProfileSelectOption[]): ProfileSelectOption[] {
  const seen = new Set<string>();

  return options.filter((option) => {
    const value = normalizeOptionText(option.value);
    const key = value.toLowerCase();

    if (!value || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeBarangayOptions(payload: any): ProfileSelectOption[] {
  const rawList =
    payload?.data?.data ??
    payload?.data ??
    payload?.barangays ??
    payload?.results ??
    payload ??
    [];

  if (!Array.isArray(rawList)) {
    return [];
  }

  return uniqueOptions(
    rawList
      .map((item: any) => {
        if (typeof item === "string") {
          return {
            label: item,
            value: item,
          };
        }

        const name =
          item?.name ??
          item?.barangay_name ??
          item?.barangay ??
          item?.label ??
          item?.title ??
          "";

        return {
          label: normalizeOptionText(name),
          value: normalizeOptionText(name),
        };
      })
      .filter((option: ProfileSelectOption) => option.label && option.value)
  );
}

function localText(key: string, lang: Lang): string {
  const dict: Record<string, Record<Lang, string>> = {
    profile_title: {
      tl: "Profile",
      pag: "Profile",
      en: "Profile",
    },
    personal_info: {
      tl: "Personal Info",
      pag: "Personal Info",
      en: "Personal Info",
    },
    first_name: {
      tl: "First Name",
      pag: "First Name",
      en: "First Name",
    },
    middle_name: {
      tl: "Middle Name",
      pag: "Middle Name",
      en: "Middle Name",
    },
    last_name: {
      tl: "Last Name",
      pag: "Last Name",
      en: "Last Name",
    },
    sex: {
      tl: "Sex / Gender",
      pag: "Sex / Gender",
      en: "Sex / Gender",
    },
    mobile_number: {
      tl: "Mobile Number",
      pag: "Mobile Number",
      en: "Mobile Number",
    },
    email: {
      tl: "Email",
      pag: "Email",
      en: "Email",
    },
    barangay: {
      tl: "Barangay",
      pag: "Barangay",
      en: "Barangay",
    },
    id_verification: {
      tl: "ID Verification",
      pag: "ID Verification",
      en: "ID Verification",
    },
    submit_valid_id: {
      tl: "Submit Valid ID",
      pag: "Submit Valid ID",
      en: "Submit Valid ID",
    },
    id_help: {
      tl: "Any government ID, School ID, Driver’s License, Passport, or PhilHealth ID accepted",
      pag: "Any government ID, School ID, Driver’s License, Passport, or PhilHealth ID accepted",
      en: "Any government ID, School ID, Driver’s License, Passport, or PhilHealth ID accepted",
    },
    upload: {
      tl: "Upload",
      pag: "Upload",
      en: "Upload",
    },
    id_note: {
      tl: "Your ID helps verify your identity for appointments and consultations.",
      pag: "Your ID helps verify your identity for appointments and consultations.",
      en: "Your ID helps verify your identity for appointments and consultations.",
    },
    security: {
      tl: "Security",
      pag: "Security",
      en: "Security",
    },
    face_id_login: {
      tl: "Face ID Login",
      pag: "Face ID Login",
      en: "Face ID Login",
    },
    fingerprint_login: {
      tl: "Fingerprint Login",
      pag: "Fingerprint Login",
      en: "Fingerprint Login",
    },
    updating: {
      tl: "Updating…",
      pag: "Updating…",
      en: "Updating…",
    },
    enabled_disable: {
      tl: "Enabled — tap to disable",
      pag: "Enabled — tap to disable",
      en: "Enabled — tap to disable",
    },
    disabled_enable: {
      tl: "Disabled — tap to enable",
      pag: "Disabled — tap to enable",
      en: "Disabled — tap to enable",
    },
    logout: {
      tl: "Mag-logout",
      pag: "Man-logout",
      en: "Logout",
    },
    logging_out: {
      tl: "Nag-logout…",
      pag: "Onlogout…",
      en: "Logging out…",
    },
    id_verified: {
      tl: "ID Verified",
      pag: "ID Verified",
      en: "ID Verified",
    },
    id_not_verified: {
      tl: "ID Not Verified",
      pag: "ID Not Verified",
      en: "ID Not Verified",
    },
    edit: {
      tl: "Edit",
      pag: "Edit",
      en: "Edit",
    },

    // Reusable ITR card titles
    more_details: {
      tl: "Karagdagang Detalye",
      pag: "Karagdagang Detalye",
      en: "Additional Details",
    },
    address_details: {
      tl: "Detalye ng Address",
      pag: "Detalye ng Address",
      en: "Address Details",
    },
    emergency_philhealth: {
      tl: "Guardian / Emergency Contact at PhilHealth",
      pag: "Guardian / Emergency Contact tan PhilHealth",
      en: "Guardian / Emergency Contact & PhilHealth",
    },
    health_background: {
      tl: "Kasaysayan ng Kalusugan",
      pag: "Kasaysayan ng Kalusugan",
      en: "Health Background",
    },
    obgyn: {
      tl: "OB / GYN (Kababaihan)",
      pag: "OB / GYN (Kababaihan)",
      en: "OB / GYN (Women)",
    },
    health_note: {
      tl: "Self-reported lang ito. Hindi kapalit ng eksaminasyon ng RHU staff.",
      pag: "Self-reported lang ini. Aliwa ed eksamen na RHU staff.",
      en: "These are self-reported and reused across visits. Staff still confirm them during check-up.",
    },
    profile_saved: {
      tl: "Na-update ang profile.",
      pag: "Na-update so profile.",
      en: "Profile updated.",
    },
    save_failed: {
      tl: "Hindi na-save. Subukan ulit.",
      pag: "Ag akasaved. Subok lamet.",
      en: "Could not save. Please try again.",
    },

    // Reusable ITR field labels
    civil_status: { tl: "Civil Status", pag: "Civil Status", en: "Civil Status" },
    religion: { tl: "Relihiyon", pag: "Relihiyon", en: "Religion" },
    educational_attainment: {
      tl: "Natapos na Pag-aaral",
      pag: "Natapos na Pag-aaral",
      en: "Educational Attainment",
    },
    occupation: { tl: "Trabaho", pag: "Trabaho", en: "Occupation" },
    client_type: { tl: "Uri ng Kliyente", pag: "Uri na Kliyente", en: "Client Type" },
    guardian_name: { tl: "Guardian", pag: "Guardian", en: "Guardian Name" },
    emergency_contact_name: {
      tl: "Emergency Contact",
      pag: "Emergency Contact",
      en: "Emergency Contact Name",
    },
    emergency_contact_number: {
      tl: "Emergency Contact No.",
      pag: "Emergency Contact No.",
      en: "Emergency Contact Number",
    },
    philhealth_number: {
      tl: "PhilHealth Number",
      pag: "PhilHealth Number",
      en: "PhilHealth Number",
    },
    street: { tl: "Kalye", pag: "Kalye", en: "Street" },
    purok: { tl: "Purok", pag: "Purok", en: "Purok" },
    household_number: {
      tl: "Household Number",
      pag: "Household Number",
      en: "Household Number",
    },
    allergies: { tl: "Allergies", pag: "Allergies", en: "Allergies" },
    past_medical_history: {
      tl: "Nakaraang Sakit",
      pag: "Akaraan na Sakit",
      en: "Past Medical History",
    },
    maintenance_medications: {
      tl: "Maintenance na Gamot",
      pag: "Maintenance na Tambal",
      en: "Maintenance Medications",
    },
    family_history: {
      tl: "Sakit sa Pamilya",
      pag: "Sakit ed Pamilya",
      en: "Family History",
    },
    personal_social_history: {
      tl: "Personal / Social History",
      pag: "Personal / Social History",
      en: "Personal / Social History",
    },
    smoking_status: {
      tl: "Naninigarilyo?",
      pag: "Mansisigarilyo?",
      en: "Smoking Status",
    },
    alcohol_intake: {
      tl: "Umiinom ng Alak?",
      pag: "Oninum na Alak?",
      en: "Alcohol Intake",
    },
    lmp: {
      tl: "Huling Regla (LMP)",
      pag: "Sampot a Regla (LMP)",
      en: "Last Menstrual Period (LMP)",
    },
    menstrual_history: {
      tl: "Menstrual History",
      pag: "Menstrual History",
      en: "Menstrual History",
    },
    family_planning_method: {
      tl: "Family Planning",
      pag: "Family Planning",
      en: "Family Planning Method",
    },
    pregnancy_history: {
      tl: "Pregnancy History",
      pag: "Pregnancy History",
      en: "Pregnancy History",
    },
  };

  return dict[key]?.[lang] ?? dict[key]?.en ?? key;
}

function EditModal({ state, lang, saving, onClose, onSave }: EditModalProps) {
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);
  const [value, setValue] = useState(state.value ?? "");

  useEffect(() => {
    setValue(state.value ?? "");
  }, [state.value, state.visible]);

  return (
    <Modal visible={state.visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.modalKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {localText("edit", lang) + " " + state.field}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                state.multiline ? styles.modalInputMultiline : null,
              ]}
              value={value}
              onChangeText={setValue}
              autoFocus
              editable={!saving}
              multiline={!!state.multiline}
              textAlignVertical={state.multiline ? "top" : "center"}
              placeholder={state.placeholder ?? state.field}
              placeholderTextColor={COLORS.faint}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                disabled={saving}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {tr("cancel", lang)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving ? styles.disabled : null]}
                disabled={saving}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave(value);
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{tr("save", lang)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function VerificationBadge({
  verified,
  lang,
}: {
  verified: boolean;
  lang: Lang;
}) {
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  return (
    <View
      style={[
        styles.verificationBadge,
        {
          backgroundColor: verified ? "#ECFDF5" : "#FEF3C7",
        },
      ]}
    >
      {verified ? (
        <Ionicons name="checkmark-circle" size={r.s(18)} color="#16A34A" />
      ) : (
        <Ionicons name="alert-circle" size={r.s(18)} color="#D97706" />
      )}

      <Text
        style={[
          styles.verificationText,
          {
            color: verified ? "#16A34A" : "#D97706",
          },
        ]}
      >
        {verified
          ? localText("id_verified", lang)
          : localText("id_not_verified", lang)}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string | null;
  onPress: () => void;
}) {
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  const safeValue = value ?? "";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.infoRow}
    >
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue}>{safeValue || "—"}</Text>
      </View>

      <Ionicons name="chevron-forward" size={r.s(22)} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);
  const lang = useLang();

  const { user, updateUser } = useAuthStore();
  const { mutate: logoutMutate, isPending: isLoggingOut } = useLogout();

  const {
    enableBiometrics,
    disableBiometrics,
    isAvailable,
    isBiometricSetUp,
  } = useBiometrics();

  const [refreshing, setRefreshing] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingSelect, setSavingSelect] = useState(false);
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [barangayOptions, setBarangayOptions] = useState<ProfileSelectOption[]>(
    []
  );

  const isFemale = String(user?.sex ?? "").trim().toLowerCase().startsWith("f");

  const completion = resolveProfileCompletion(user);

  const [editModal, setEditModal] = useState<EditModalState>({
    visible: false,
    field: "",
    key: "",
    value: "",
  });

  const [selectModal, setSelectModal] = useState<SelectModalState>({
    visible: false,
    field: "",
    key: "",
    value: "",
    options: [],
  });

  const avatarUri = resolveAvatarUrl(user?.avatar ?? undefined);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Pasyente";

  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "P";

  const checkBiometrics = useCallback(async () => {
    try {
      const available = await isAvailable();
      const setup = await isBiometricSetUp();

      setBiometricAvailable(available);
      setBiometricOn(available && setup);
    } catch {
      setBiometricAvailable(false);
      setBiometricOn(false);
    }
  }, [isAvailable, isBiometricSetUp]);

  useEffect(() => {
    checkBiometrics();
  }, [checkBiometrics]);

  // Merge a server profile payload into the local store, keeping the avatar
  // resolved to a displayable URL (server sends a raw path + avatar_url).
  const mergeServerUser = useCallback(
    (fresh: any) => {
      if (!fresh) {
        return;
      }

      const resolvedAvatar =
        resolveAvatarUrl(fresh.avatar_url ?? fresh.avatar ?? undefined) ??
        fresh.avatar ??
        null;

      updateUser({ ...fresh, avatar: resolvedAvatar });
    },
    [updateUser]
  );

  const loadProfile = useCallback(async () => {
    try {
      const fresh = await getProfile();
      mergeServerUser(fresh);
    } catch {
      // Non-fatal: keep showing the cached profile if the fetch fails.
    }
  }, [mergeServerUser]);

  const loadBarangays = useCallback(async (): Promise<ProfileSelectOption[]> => {
    if (barangayOptions.length > 0) {
      return barangayOptions;
    }

    setBarangayLoading(true);

    try {
      const response = await apiClient.get("/barangays");
      const options = normalizeBarangayOptions(response.data);

      setBarangayOptions(options);

      return options;
    } catch {
      Alert.alert(
        "Barangays unavailable",
        "Could not load the barangay list. Please check your connection and try again."
      );

      return [];
    } finally {
      setBarangayLoading(false);
    }
  }, [barangayOptions]);

  useFocusEffect(
    useCallback(() => {
      logActivity("PROFILE_VIEW", {
        user_id: user?.user_id,
      });

      loadProfile();
    }, [user?.user_id, loadProfile])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([checkBiometrics(), loadProfile()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow gallery access to change your photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const uri = result.assets[0].uri;

    setUploadingAvatar(true);

    const formData = new FormData();

    formData.append("avatar", {
      uri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);

    try {
      const response = await apiClient.post<{ avatar_url: string }>(
        "/profile/avatar",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const resolvedUrl =
        resolveAvatarUrl(response.data.avatar_url) ?? response.data.avatar_url;

      updateUser({
        avatar: resolvedUrl,
      });

      Alert.alert("Success", "Profile picture updated.");
    } catch (error: any) {
      const status = error?.response?.status;

      Alert.alert(
        "Upload Failed",
        status === 422
          ? "Image format not accepted. Use JPG or PNG under 5 MB."
          : "Could not upload photo. Try again."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout?", "Sigurado ka?", [
      {
        text: tr("cancel", lang),
        style: "cancel",
      },
      {
        text: localText("logout", lang),
        style: "destructive",
        onPress: () =>
          logoutMutate(undefined, {
            onSettled: () => {
              router.replace("/(auth)/login");
            },
          }),
      },
    ]);
  };

  const toggleBiometrics = async () => {
    if (biometricLoading) {
      return;
    }

    setBiometricLoading(true);

    try {
      if (biometricOn) {
        await disableBiometrics();
        setBiometricOn(false);
      } else {
        await enableBiometrics();
        setBiometricOn(true);
      }
    } catch (error: any) {
      Alert.alert(
        "Biometrics Error",
        error?.message ??
          "Could not update biometric settings. Please try again."
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  const openEdit = (
    key: string,
    field: string,
    value?: string | null,
    opts?: { multiline?: boolean; placeholder?: string }
  ) => {
    setEditModal({
      visible: true,
      field,
      key,
      value: value ?? "",
      multiline: opts?.multiline,
      placeholder: opts?.placeholder,
    });
  };

  const openSelect = (
    key: string,
    field: string,
    value: string | null | undefined,
    options: ProfileSelectOption[],
    opts?: { searchable?: boolean; loading?: boolean }
  ) => {
    setSelectModal({
      visible: true,
      field,
      key,
      value: value ?? "",
      options,
      searchable: opts?.searchable,
      loading: opts?.loading,
    });
  };

  const openBarangaySelect = async () => {
    openSelect(
      "barangay",
      localText("barangay", lang),
      user?.barangay,
      barangayOptions,
      {
        searchable: true,
        loading: barangayOptions.length <= 0,
      }
    );

    const options = await loadBarangays();

    setSelectModal((current) => {
      if (!current.visible || current.key !== "barangay") {
        return current;
      }

      return {
        ...current,
        options,
        loading: false,
      };
    });
  };

  const saveEdit = async (value: string) => {
    const key = editModal.key;
    const trimmed = value.trim();

    setSavingEdit(true);

    try {
      const fresh = await updateProfile({
        [key]: trimmed === "" ? null : trimmed,
      } as any);

      mergeServerUser(fresh);

      setEditModal((current) => ({
        ...current,
        visible: false,
      }));
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message as string | undefined;

      Alert.alert(
        localText("save_failed", lang),
        apiMessage ?? "Please check your input and try again."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const saveSelect = async (value: string) => {
    const key = selectModal.key;
    const trimmed = value.trim();

    setSavingSelect(true);

    try {
      const fresh = await updateProfile({
        [key]: trimmed === "" ? null : trimmed,
      } as any);

      mergeServerUser(fresh);

      setSelectModal((current) => ({
        ...current,
        visible: false,
      }));
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message as string | undefined;

      Alert.alert(
        localText("save_failed", lang),
        apiMessage ?? "Please check your selection and try again."
      );
    } finally {
      setSavingSelect(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top + r.vs(10),
          },
        ]}
      >
        <View style={styles.headerMax}>
          <View style={styles.headerSide} />

          <Text style={styles.headerTitle}>
            {localText("profile_title", lang)}
          </Text>

          <View style={styles.headerSideRight}>
            <LanguageSwitcher compact />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileHero}>
          <TouchableOpacity
            onPress={handleChangeAvatar}
            activeOpacity={0.85}
            disabled={uploadingAvatar}
            style={styles.avatarWrap}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => updateUser({ avatar: undefined })}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}

            <View style={styles.cameraButton}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="camera" size={r.s(20)} color={COLORS.primary} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName}</Text>

          <Text style={styles.barangayText}>{user?.barangay ?? "—"}</Text>

          <VerificationBadge verified={!!user?.id_verified} lang={lang} />
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: completion.is_complete ? "#ECFDF5" : "#FFFBEB",
              borderColor: completion.is_complete ? "#A7F3D0" : "#FDE68A",
              borderWidth: 1,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={completion.is_complete ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={completion.is_complete ? "#047857" : "#B45309"}
            />
            <Text
              style={{
                flex: 1,
                fontWeight: "900",
                fontSize: 15,
                color: completion.is_complete ? "#047857" : "#92400E",
              }}
            >
              Profile Completion — {completion.percent}%
            </Text>
          </View>

          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: "#E5E7EB",
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.max(4, Math.min(100, completion.percent))}%`,
                height: "100%",
                backgroundColor: completion.is_complete ? "#10B981" : "#F59E0B",
              }}
            />
          </View>

          {!completion.is_complete ? (
            <>
              <Text
                style={{ color: "#92400E", marginTop: 10, fontSize: 13, lineHeight: 19 }}
              >
                {completion.message}
              </Text>

              {completion.missing_labels.length > 0 ? (
                <Text
                  style={{ color: "#92400E", marginTop: 6, fontSize: 12, fontWeight: "700" }}
                >
                  Missing: {completion.missing_labels.join(", ")}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Complete Missing Information",
                    completion.missing_labels.length > 0
                      ? "Tap each field below to fill it in:\n\n• " +
                          completion.missing_labels.join("\n• ")
                      : "Please review and complete your profile fields below."
                  )
                }
                activeOpacity={0.85}
                style={{
                  marginTop: 12,
                  alignSelf: "flex-start",
                  backgroundColor: "#B45309",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
                  Complete Missing Information
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={{ color: "#047857", marginTop: 10, fontSize: 13 }}>
              Your health profile is complete. You can book a consultation.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{localText("personal_info", lang)}</Text>

          <InfoRow
            label={localText("first_name", lang)}
            value={user?.first_name}
            onPress={() =>
              openEdit("first_name", localText("first_name", lang), user?.first_name)
            }
          />

          <InfoRow
            label={localText("middle_name", lang)}
            value={(user as any)?.middle_name}
            onPress={() =>
              openEdit(
                "middle_name",
                localText("middle_name", lang),
                (user as any)?.middle_name
              )
            }
          />

          <InfoRow
            label={localText("last_name", lang)}
            value={user?.last_name}
            onPress={() =>
              openEdit("last_name", localText("last_name", lang), user?.last_name)
            }
          />

          <InfoRow
            label={localText("sex", lang)}
            value={user?.sex}
            onPress={() =>
              openSelect("sex", localText("sex", lang), user?.sex, SEX_OPTIONS)
            }
          />

          <InfoRow
            label={localText("mobile_number", lang)}
            value={user?.mobile_number}
            onPress={() =>
              openEdit(
                "mobile_number",
                localText("mobile_number", lang),
                user?.mobile_number
              )
            }
          />

          <InfoRow
            label={localText("email", lang)}
            value={user?.email}
            onPress={() => openEdit("email", localText("email", lang), user?.email)}
          />

          <InfoRow
            label={localText("barangay", lang)}
            value={user?.barangay}
            onPress={openBarangaySelect}
          />
        </View>

        {/* Additional reusable details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{localText("more_details", lang)}</Text>

          <InfoRow
            label={localText("civil_status", lang)}
            value={user?.civil_status}
            onPress={() =>
              openSelect(
                "civil_status",
                localText("civil_status", lang),
                user?.civil_status,
                CIVIL_STATUS_OPTIONS
              )
            }
          />

          <InfoRow
            label={localText("religion", lang)}
            value={user?.religion}
            onPress={() =>
              openSelect(
                "religion",
                localText("religion", lang),
                user?.religion,
                RELIGION_OPTIONS
              )
            }
          />

          <InfoRow
            label={localText("educational_attainment", lang)}
            value={user?.educational_attainment}
            onPress={() =>
              openSelect(
                "educational_attainment",
                localText("educational_attainment", lang),
                user?.educational_attainment,
                EDUCATIONAL_ATTAINMENT_OPTIONS
              )
            }
          />

          <InfoRow
            label={localText("occupation", lang)}
            value={user?.occupation}
            onPress={() =>
              openEdit(
                "occupation",
                localText("occupation", lang),
                user?.occupation
              )
            }
          />

          <InfoRow
            label={localText("client_type", lang)}
            value={user?.client_type}
            onPress={() =>
              openSelect(
                "client_type",
                localText("client_type", lang),
                user?.client_type,
                CLIENT_TYPE_OPTIONS
              )
            }
          />

          <InfoRow
            label={localText("guardian_name", lang)}
            value={user?.guardian_name}
            onPress={() =>
              openEdit(
                "guardian_name",
                localText("guardian_name", lang),
                user?.guardian_name
              )
            }
          />
        </View>

        {/* Address details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {localText("address_details", lang)}
          </Text>

          <InfoRow
            label={localText("street", lang)}
            value={user?.street}
            onPress={() =>
              openEdit("street", localText("street", lang), user?.street)
            }
          />

          <InfoRow
            label={localText("purok", lang)}
            value={user?.purok}
            onPress={() =>
              openEdit("purok", localText("purok", lang), user?.purok)
            }
          />

          <InfoRow
            label={localText("household_number", lang)}
            value={user?.household_number}
            onPress={() =>
              openEdit(
                "household_number",
                localText("household_number", lang),
                user?.household_number
              )
            }
          />
        </View>

        {/* Emergency & PhilHealth */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {localText("emergency_philhealth", lang)}
          </Text>

          <InfoRow
            label={localText("emergency_contact_name", lang)}
            value={user?.emergency_contact_name}
            onPress={() =>
              openEdit(
                "emergency_contact_name",
                localText("emergency_contact_name", lang),
                user?.emergency_contact_name
              )
            }
          />

          <InfoRow
            label={localText("emergency_contact_number", lang)}
            value={user?.emergency_contact_number}
            onPress={() =>
              openEdit(
                "emergency_contact_number",
                localText("emergency_contact_number", lang),
                user?.emergency_contact_number
              )
            }
          />

          <InfoRow
            label={localText("philhealth_number", lang)}
            value={user?.philhealth_number}
            onPress={() =>
              openEdit(
                "philhealth_number",
                localText("philhealth_number", lang),
                user?.philhealth_number
              )
            }
          />
        </View>

        {/* Health background (self-reported, reusable) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {localText("health_background", lang)}
          </Text>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{localText("health_note", lang)}</Text>
          </View>

          <InfoRow
            label={localText("allergies", lang)}
            value={user?.allergies}
            onPress={() =>
              openEdit("allergies", localText("allergies", lang), user?.allergies, {
                multiline: true,
              })
            }
          />

          <InfoRow
            label={localText("past_medical_history", lang)}
            value={user?.past_medical_history}
            onPress={() =>
              openEdit(
                "past_medical_history",
                localText("past_medical_history", lang),
                user?.past_medical_history,
                { multiline: true }
              )
            }
          />

          <InfoRow
            label={localText("maintenance_medications", lang)}
            value={user?.maintenance_medications}
            onPress={() =>
              openEdit(
                "maintenance_medications",
                localText("maintenance_medications", lang),
                user?.maintenance_medications,
                { multiline: true }
              )
            }
          />

          <InfoRow
            label={localText("family_history", lang)}
            value={user?.family_history}
            onPress={() =>
              openEdit(
                "family_history",
                localText("family_history", lang),
                user?.family_history,
                { multiline: true }
              )
            }
          />

          <InfoRow
            label={localText("personal_social_history", lang)}
            value={user?.personal_social_history}
            onPress={() =>
              openEdit(
                "personal_social_history",
                localText("personal_social_history", lang),
                user?.personal_social_history,
                { multiline: true }
              )
            }
          />

          <InfoRow
            label={localText("smoking_status", lang)}
            value={user?.smoking_status}
            onPress={() =>
              openSelect(
                "smoking_status",
                localText("smoking_status", lang),
                user?.smoking_status,
                SMOKING_STATUS_OPTIONS
              )
            }
          />

          <InfoRow
            label={localText("alcohol_intake", lang)}
            value={user?.alcohol_intake}
            onPress={() =>
              openSelect(
                "alcohol_intake",
                localText("alcohol_intake", lang),
                user?.alcohol_intake,
                ALCOHOL_INTAKE_OPTIONS
              )
            }
          />
        </View>

        {/* OB / GYN — only relevant for female patients */}
        {isFemale ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{localText("obgyn", lang)}</Text>

            <InfoRow
              label={localText("lmp", lang)}
              value={user?.lmp}
              onPress={() =>
                openEdit("lmp", localText("lmp", lang), user?.lmp, {
                  placeholder: "YYYY-MM-DD",
                })
              }
            />

            <InfoRow
              label={localText("menstrual_history", lang)}
              value={user?.menstrual_history}
              onPress={() =>
                openEdit(
                  "menstrual_history",
                  localText("menstrual_history", lang),
                  user?.menstrual_history,
                  { multiline: true }
                )
              }
            />

            <InfoRow
              label={localText("family_planning_method", lang)}
              value={user?.family_planning_method}
              onPress={() =>
                openEdit(
                  "family_planning_method",
                  localText("family_planning_method", lang),
                  user?.family_planning_method
                )
              }
            />

            <InfoRow
              label={localText("pregnancy_history", lang)}
              value={user?.pregnancy_history}
              onPress={() =>
                openEdit(
                  "pregnancy_history",
                  localText("pregnancy_history", lang),
                  user?.pregnancy_history,
                  { multiline: true }
                )
              }
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {localText("id_verification", lang)}
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/ocr-upload" as any)}
            activeOpacity={0.85}
            style={styles.idRow}
          >
            <View style={styles.idTextWrap}>
              <Text style={styles.idTitle}>
                {localText("submit_valid_id", lang)}
              </Text>

              <Text style={styles.idSub}>{localText("id_help", lang)}</Text>
            </View>

            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeText}>
                {localText("upload", lang)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{localText("id_note", lang)}</Text>
          </View>
        </View>

        {biometricAvailable ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{localText("security", lang)}</Text>

            <TouchableOpacity
              onPress={toggleBiometrics}
              disabled={biometricLoading}
              activeOpacity={0.85}
              style={styles.biometricRow}
            >
              <View style={styles.infoTextWrap}>
                <Text style={styles.biometricTitle}>
                  {Platform.OS === "ios"
                    ? localText("face_id_login", lang)
                    : localText("fingerprint_login", lang)}
                </Text>

                <Text style={styles.biometricSub}>
                  {biometricLoading
                    ? localText("updating", lang)
                    : biometricOn
                      ? localText("enabled_disable", lang)
                      : localText("disabled_enable", lang)}
                </Text>
              </View>

              <View
                style={[
                  styles.switchTrack,
                  {
                    backgroundColor: biometricLoading
                      ? "#D1D5DB"
                      : biometricOn
                        ? COLORS.primary
                        : "#E5E7EB",
                  },
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    biometricOn ? styles.switchThumbOn : styles.switchThumbOff,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleLogout}
          disabled={isLoggingOut}
          activeOpacity={0.85}
          style={[styles.logoutButton, isLoggingOut ? styles.disabled : null]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : null}

          <Text style={styles.logoutText}>
            {isLoggingOut
              ? localText("logging_out", lang)
              : localText("logout", lang)}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <EditModal
        state={editModal}
        lang={lang}
        saving={savingEdit}
        onClose={() =>
          setEditModal((current) => ({
            ...current,
            visible: false,
          }))
        }
        onSave={saveEdit}
      />

      <ProfileSelectModal
        visible={selectModal.visible}
        title={selectModal.field}
        options={selectModal.options}
        selectedValue={selectModal.value}
        searchable={selectModal.searchable}
        loading={selectModal.loading || savingSelect || barangayLoading}
        onClose={() =>
          setSelectModal((current) => ({
            ...current,
            visible: false,
          }))
        }
        onSelect={saveSelect}
      />

      <DraggableChatFAB onOpen={() => router.push("/chatbot" as any)} />
    </View>
  );
}

const makeStyles = (r: Responsive) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },
    topHeader: {
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      paddingHorizontal: r.horizontalPadding,
      paddingBottom: r.vs(12),
    },
    headerMax: {
      width: "100%",
      maxWidth: r.maxContentWidth,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSide: {
      width: r.s(70),
    },
    headerSideRight: {
      width: r.s(70),
      alignItems: "flex-end",
    },
    headerTitle: {
      flex: 1,
      color: COLORS.ink,
      fontSize: r.fs(22),
      fontFamily: FONTS.bold,
      textAlign: "center",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: r.vs(125),
    },
    profileHero: {
      backgroundColor: COLORS.primary,
      paddingTop: r.vs(24),
      paddingBottom: r.vs(28),
      alignItems: "center",
      paddingHorizontal: r.horizontalPadding,
    },
    avatarWrap: {
      position: "relative",
    },
    avatarImage: {
      width: r.s(98),
      height: r.s(98),
      borderRadius: r.s(49),
      borderWidth: 4,
      borderColor: "#FFFFFF",
    },
    avatarFallback: {
      width: r.s(98),
      height: r.s(98),
      borderRadius: r.s(49),
      backgroundColor: "#2DD4BF",
      borderWidth: 4,
      borderColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      color: "#FFFFFF",
      fontSize: r.fs(30),
      fontFamily: FONTS.bold,
    },
    cameraButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: r.s(32),
      height: r.s(32),
      borderRadius: r.s(16),
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    displayName: {
      color: "#FFFFFF",
      fontSize: r.fs(22),
      fontFamily: FONTS.bold,
      marginTop: r.vs(12),
      textAlign: "center",
    },
    barangayText: {
      color: COLORS.primarySoft,
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
      marginTop: r.vs(2),
      textAlign: "center",
    },
    verificationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: r.s(5),
      paddingHorizontal: r.s(11),
      paddingVertical: r.vs(5),
      borderRadius: 999,
      marginTop: r.vs(10),
    },
    verificationText: {
      fontSize: r.fs(12),
      fontFamily: FONTS.bold,
    },
    card: {
      width: "100%",
      maxWidth: r.maxContentWidth,
      alignSelf: "center",
      marginTop: r.vs(14),
      marginHorizontal: r.horizontalPadding,
      backgroundColor: "#FFFFFF",
      borderRadius: r.s(20),
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: "hidden",
    },
    cardTitle: {
      color: COLORS.muted,
      fontSize: r.fs(13),
      fontFamily: FONTS.bold,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      paddingHorizontal: r.s(16),
      paddingTop: r.vs(16),
      paddingBottom: r.vs(8),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: r.s(16),
      paddingVertical: r.vs(14),
      borderTopWidth: 1,
      borderTopColor: "#F1F5F9",
    },
    infoTextWrap: {
      flex: 1,
      minWidth: 0,
      paddingRight: r.s(10),
    },
    infoLabel: {
      color: COLORS.faint,
      fontSize: r.fs(12),
      fontFamily: FONTS.regular,
      marginBottom: r.vs(2),
    },
    infoValue: {
      color: COLORS.ink,
      fontSize: r.fs(14),
      fontFamily: FONTS.semiBold,
    },
    idRow: {
      flexDirection: r.isSmallPhone ? "column" : "row",
      alignItems: r.isSmallPhone ? "flex-start" : "center",
      justifyContent: "space-between",
      gap: r.s(10),
      paddingHorizontal: r.s(16),
      paddingVertical: r.vs(15),
      borderTopWidth: 1,
      borderTopColor: "#F1F5F9",
    },
    idTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    idTitle: {
      color: COLORS.ink,
      fontSize: r.fs(15),
      fontFamily: FONTS.semiBold,
    },
    idSub: {
      color: COLORS.muted,
      fontSize: r.fs(12),
      fontFamily: FONTS.regular,
      marginTop: r.vs(3),
      lineHeight: r.fs(18),
    },
    uploadBadge: {
      backgroundColor: COLORS.primarySofter,
      paddingHorizontal: r.s(12),
      paddingVertical: r.vs(7),
      borderRadius: 999,
      alignSelf: r.isSmallPhone ? "flex-start" : "center",
    },
    uploadBadgeText: {
      color: COLORS.primary,
      fontSize: r.fs(13),
      fontFamily: FONTS.bold,
    },
    noteBox: {
      paddingHorizontal: r.s(16),
      paddingVertical: r.vs(12),
      borderTopWidth: 1,
      borderTopColor: "#F1F5F9",
    },
    noteText: {
      color: COLORS.faint,
      fontSize: r.fs(12),
      fontFamily: FONTS.regular,
      lineHeight: r.fs(18),
    },
    biometricRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: r.s(16),
      paddingVertical: r.vs(15),
      borderTopWidth: 1,
      borderTopColor: "#F1F5F9",
    },
    biometricTitle: {
      color: COLORS.ink,
      fontSize: r.fs(14),
      fontFamily: FONTS.semiBold,
    },
    biometricSub: {
      color: COLORS.faint,
      fontSize: r.fs(12),
      fontFamily: FONTS.regular,
      marginTop: r.vs(2),
    },
    switchTrack: {
      width: r.s(48),
      height: r.s(26),
      borderRadius: r.s(13),
      justifyContent: "center",
      paddingHorizontal: r.s(3),
    },
    switchThumb: {
      width: r.s(20),
      height: r.s(20),
      borderRadius: r.s(10),
      backgroundColor: "#FFFFFF",
    },
    switchThumbOn: {
      alignSelf: "flex-end",
    },
    switchThumbOff: {
      alignSelf: "flex-start",
    },
    logoutButton: {
      width: "100%",
      maxWidth: r.maxContentWidth,
      alignSelf: "center",
      marginTop: r.vs(16),
      marginHorizontal: r.horizontalPadding,
      borderWidth: 1,
      borderColor: "#FECACA",
      borderRadius: r.s(18),
      paddingVertical: r.vs(14),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: r.s(8),
      backgroundColor: "#FFFFFF",
    },
    disabled: {
      opacity: 0.55,
    },
    logoutText: {
      color: "#EF4444",
      fontSize: r.fs(16),
      fontFamily: FONTS.bold,
    },
    modalKeyboard: {
      flex: 1,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(15,23,42,0.45)",
    },
    modalSheet: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: r.s(28),
      borderTopRightRadius: r.s(28),
      padding: r.s(20),
      paddingBottom: r.vs(26),
    },
    modalTitle: {
      color: COLORS.ink,
      fontSize: r.fs(18),
      fontFamily: FONTS.bold,
      marginBottom: r.vs(10),
    },
    modalInput: {
      borderWidth: 1,
      borderColor: COLORS.borderStrong,
      borderRadius: r.s(14),
      paddingHorizontal: r.s(14),
      paddingVertical: r.vs(12),
      color: COLORS.ink,
      backgroundColor: "#F8FAFC",
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
      marginBottom: r.vs(14),
    },
    modalInputMultiline: {
      minHeight: r.vs(110),
      paddingTop: r.vs(12),
    },
    modalActions: {
      flexDirection: "row",
      gap: r.s(10),
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: COLORS.borderStrong,
      borderRadius: r.s(14),
      paddingVertical: r.vs(12),
      alignItems: "center",
    },
    cancelButtonText: {
      color: COLORS.muted,
      fontSize: r.fs(14),
      fontFamily: FONTS.bold,
    },
    saveButton: {
      flex: 1,
      backgroundColor: COLORS.primary,
      borderRadius: r.s(14),
      paddingVertical: r.vs(12),
      alignItems: "center",
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: r.fs(14),
      fontFamily: FONTS.bold,
    },
  });