// app/appointments/create.tsx
// Ka-Agapay Mobile — Patient ITR + Consultation booking.
//
// The patient fills (or confirms pre-filled) ITR information BEFORE booking.
// Existing profile/resident-profile values are auto-loaded. On submit we:
//   1) persist any ITR profile fields back to the profile (best-effort), and
//   2) create the appointment (reason + schedule + RHU).
// Symptom-heavy fields are removed; Chief Complaint / Reason is used instead.

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ScreenHeader from "../../Components/ScreenHeader";
import {
  createAppointment,
  type ConsultationType,
} from "../../services/api/appointments";
import { getProfile, updateProfile } from "../../services/api/profile";
import { scanPhilHealth, maskPhilHealth } from "../../services/api/ocr";
import {
  resolveProfileCompletion,
  type ProfileCompletion,
} from "../../utils/profileCompletion";
import { tr, useLang } from "../../constants/i18n";

function pad2(n: number) {
  return n < 10 ? "0" + n : String(n);
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function formatTimeLabel(d: Date) {
  let h = d.getHours();
  const m = pad2(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
function formatDateLabel(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function ageFromBirth(birth?: Date | null): string {
  if (!birth) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 130 ? String(age) : "";
}
function defaultTime() {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}
function truthyFlag(value?: string | null): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  return v !== "" && !["no", "none", "false", "0", "non-smoker", "n"].includes(v);
}

const GENDER_OPTIONS = ["Male", "Female"];
const CIVIL_STATUS_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Separated",
  "Divorced",
];
const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type PickerKey =
  | "consultation"
  | "birth"
  | "guardian"
  | "lmp"
  | "time"
  | null;

export default function CreateAppointmentScreen() {
  const router = useRouter();
  const lang = useLang();

  // Booking
  const [consultationType, setConsultationType] =
    useState<ConsultationType>("onsite");
  const [rhuId, setRhuId] = useState<number>(1);
  const [consultationDate, setConsultationDate] = useState<Date>(new Date());
  const [preferredTime, setPreferredTime] = useState<Date>(defaultTime());
  const [reason, setReason] = useState("");

  // ITR identity
  const [philhealth, setPhilhealth] = useState("");
  const [philhealthVerified, setPhilhealthVerified] = useState(false);
  const [philhealthShown, setPhilhealthShown] = useState(false);
  const [philhealthScanning, setPhilhealthScanning] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");
  const [religion, setReligion] = useState("");
  const [education, setEducation] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianBirthdate, setGuardianBirthdate] = useState<Date | null>(null);
  const [bloodType, setBloodType] = useState("");

  // ITR history / lifestyle
  const [personalSocial, setPersonalSocial] = useState("");
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState(false);
  const [pastMedical, setPastMedical] = useState("");
  const [allergies, setAllergies] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // Female-only
  const [numChildren, setNumChildren] = useState("");
  const [lmp, setLmp] = useState<Date | null>(null);
  const [periodDuration, setPeriodDuration] = useState("");
  const [cycle, setCycle] = useState("");
  const [fpMethod, setFpMethod] = useState("");
  const [menopausalAge, setMenopausalAge] = useState("");

  const [activePicker, setActivePicker] = useState<PickerKey>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);

  const RHU_OPTIONS = [
    { id: 1, label: "RHU 1", sub: "Poblacion / Main RHU" },
    { id: 2, label: "RHU 2", sub: "Secondary RHU" },
  ];

  // Prefill from the patient's existing profile / resident profile.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p: any = await getProfile();
        if (!active || !p) return;

        setPhilhealth(String(p.philhealth_number ?? p.philhealth_no ?? ""));
        setPhilhealthVerified(Boolean(p.philhealth_verified_at));
        setFirstName(String(p.first_name ?? ""));
        setMiddleName(String(p.middle_name ?? ""));
        setLastName(String(p.last_name ?? ""));

        const b = parseDate(p.birthday ?? p.birth_date ?? p.date_of_birth);
        if (b) {
          setBirthDate(b);
          setAge(ageFromBirth(b));
        }

        setGender(String(p.sex ?? p.gender ?? ""));
        setCivilStatus(String(p.civil_status ?? ""));
        setReligion(String(p.religion ?? ""));
        setEducation(String(p.educational_attainment ?? ""));
        setGuardianName(String(p.guardian_name ?? ""));
        setGuardianBirthdate(parseDate(p.guardian_birthdate));
        setBloodType(String(p.blood_type ?? ""));

        setPersonalSocial(String(p.personal_social_history ?? ""));
        setSmoking(truthyFlag(p.smoking_status));
        setAlcohol(truthyFlag(p.alcohol_intake));
        setPastMedical(
          String(p.past_medical_history ?? p.medical_history ?? "")
        );
        setAllergies(String(p.allergies ?? ""));
        setMaintenance(String(p.maintenance_medications ?? ""));

        setNumChildren(String(p.number_of_children ?? ""));
        setLmp(parseDate(p.lmp));
        setPeriodDuration(String(p.period_duration ?? ""));
        setCycle(String(p.cycle ?? ""));
        setFpMethod(String(p.family_planning_method ?? ""));
        setMenopausalAge(String(p.menopausal_age ?? ""));

        setCompletion(resolveProfileCompletion(p));
      } catch {
        // Non-fatal — patient can still fill the form manually.
      } finally {
        if (active) setLoadingProfile(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isFemale = useMemo(
    () => String(gender).trim().toLowerCase().startsWith("f"),
    [gender]
  );

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const key = activePicker;
    if (Platform.OS !== "ios") setActivePicker(null);
    if (event.type === "dismissed" || !selected) return;

    if (key === "consultation") setConsultationDate(selected);
    else if (key === "time") setPreferredTime(selected);
    else if (key === "birth") {
      setBirthDate(selected);
      setAge(ageFromBirth(selected));
    } else if (key === "guardian") setGuardianBirthdate(selected);
    else if (key === "lmp") setLmp(selected);
  };

  const onScanPhilHealth = async () => {
    if (philhealthScanning) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access to scan your PhilHealth ID.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (picked.canceled) return;

    setPhilhealthScanning(true);
    try {
      const result = await scanPhilHealth(picked.assets[0].uri);

      if (result.verified && result.philhealth_number) {
        setPhilhealth(result.philhealth_number);
        setPhilhealthVerified(true);
        Alert.alert("PhilHealth Verified", "The PhilHealth ID name matched your profile and was saved.");
      } else {
        setPhilhealthVerified(false);
        Alert.alert("Verification Failed", result.message || "The PhilHealth ID could not be verified.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "PhilHealth scan failed. Please try again.");
    } finally {
      setPhilhealthScanning(false);
    }
  };

  function goToProfile() {
    router.push("/(tabs)/profile" as any);
  }

  function blockedWithProfile(message: string, missing?: string[]) {
    const missingLine =
      missing && missing.length > 0 ? `\n\nMissing: ${missing.slice(0, 6).join(", ")}` : "";
    Alert.alert("Complete your health profile", message + missingLine, [
      { text: "Not now", style: "cancel" },
      { text: "Complete Profile", onPress: goToProfile },
    ]);
  }

  function validate(): string | null {
    if (!firstName.trim()) return "Please enter your First Name.";
    if (!lastName.trim()) return "Please enter your Last Name.";
    if (!birthDate && !age.trim()) return "Please enter Birth Date or Age.";
    if (!gender.trim()) return "Please select your Gender.";
    if (!civilStatus.trim()) return "Please select your Civil Status.";
    if (!guardianName.trim()) return "Please enter your Guardian / Emergency Contact Name.";
    if (!reason.trim()) return "Please enter your Chief Complaint / Reason.";
    return null;
  }

  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Required", err);
      return;
    }

    setSubmitting(true);

    // 1) Save ITR profile fields FIRST. This is mandatory now: if the profile
    //    cannot be saved, we must NOT create an appointment with an incomplete ITR.
    try {
      const updated: any = await updateProfile({
        first_name: firstName.trim() || null,
        middle_name: middleName.trim() || null,
        last_name: lastName.trim() || null,
        philhealth_number: philhealth.trim() || null,
        birthday: birthDate ? formatDate(birthDate) : null,
        sex: gender.trim() || null,
        civil_status: civilStatus.trim() || null,
        religion: religion.trim() || null,
        educational_attainment: education.trim() || null,
        guardian_name: guardianName.trim() || null,
        guardian_birthdate: guardianBirthdate
          ? formatDate(guardianBirthdate)
          : null,
        blood_type: bloodType.trim() || null,
        personal_social_history: personalSocial.trim() || null,
        smoking_status: smoking ? "Yes" : "No",
        alcohol_intake: alcohol ? "Yes" : "No",
        past_medical_history: pastMedical.trim() || null,
        allergies: allergies.trim() || null,
        maintenance_medications: maintenance.trim() || null,
        ...(isFemale
          ? {
              number_of_children: numChildren.trim() || null,
              lmp: lmp ? formatDate(lmp) : null,
              period_duration: periodDuration.trim() || null,
              cycle: cycle.trim() || null,
              family_planning_method: fpMethod.trim() || null,
              menopausal_age: menopausalAge.trim() || null,
            }
          : {}),
      });

      // 2) Re-check completion from the authoritative saved profile. Some required
      //    ITR fields (e.g. Mobile Number, Barangay) live on the account and are
      //    not editable from this booking form — if those are still missing, block
      //    and route the patient to the profile screen.
      const fresh = resolveProfileCompletion(updated);
      setCompletion(fresh);

      if (!fresh.can_book_consultation) {
        setSubmitting(false);
        blockedWithProfile(
          fresh.message ||
            "Please complete your health profile before booking a consultation. These details are required for your ITR.",
          fresh.missing_labels
        );
        return;
      }
    } catch (error: any) {
      setSubmitting(false);
      Alert.alert(
        "Profile not saved",
        error?.response?.data?.message ||
          error?.message ||
          "We could not save your health profile, so the appointment was not created. Please try again or complete your profile.",
        [
          { text: "Try again", style: "cancel" },
          { text: "Complete Profile", onPress: goToProfile },
        ]
      );
      return;
    }

    // 3) Profile is saved and complete — create the appointment.
    try {
      const appointment = await createAppointment({
        consultation_type: consultationType,
        rhu_id: rhuId,
        reason: reason.trim(),
        preferred_date: formatDate(consultationDate),
        preferred_time: formatTime(preferredTime),
      });

      Alert.alert(
        "Appointment request sent",
        "Please wait for RHU approval. You will be notified once it is approved or scheduled.",
        [
          {
            text: "View My Appointments",
            onPress: () =>
              router.replace(("/appointments/" + String(appointment.id)) as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create appointment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickerValueFor = (): Date => {
    switch (activePicker) {
      case "consultation":
        return consultationDate;
      case "time":
        return preferredTime;
      case "birth":
        return birthDate ?? new Date(2000, 0, 1);
      case "guardian":
        return guardianBirthdate ?? new Date(1980, 0, 1);
      case "lmp":
        return lmp ?? new Date();
      default:
        return new Date();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScreenHeader
        title={tr("create_appt_title", lang)}
        subtitle={tr("create_appt_subtitle", lang)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {loadingProfile ? (
            <View style={infoCard}>
              <ActivityIndicator color="#0D9488" />
              <Text style={{ color: "#0F766E", marginTop: 6 }}>
                Loading your saved information…
              </Text>
            </View>
          ) : (
            <View style={infoCard}>
              <Text style={{ color: "#0F766E", fontWeight: "900", fontSize: 15 }}>
                Patient Information (ITR)
              </Text>
              <Text style={{ color: "#374151", marginTop: 4, fontSize: 13 }}>
                We pre-filled what we already have. Please review and complete the
                required fields before booking.
              </Text>
            </View>
          )}

          {completion && !completion.can_book_consultation ? (
            <View style={warnBanner}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#B45309" />
                <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 14, flex: 1 }}>
                  Health profile incomplete ({completion.percent}%)
                </Text>
              </View>
              <Text style={{ color: "#92400E", marginTop: 6, fontSize: 13, lineHeight: 19 }}>
                {completion.message}
              </Text>
              {completion.missing_labels && completion.missing_labels.length > 0 ? (
                <Text style={{ color: "#92400E", marginTop: 4, fontSize: 12, fontWeight: "700" }}>
                  Missing: {completion.missing_labels.slice(0, 3).join(", ")}
                  {completion.missing_labels.length > 3 ? "…" : ""}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={goToProfile}
                activeOpacity={0.85}
                style={{
                  marginTop: 10,
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
                <Ionicons name="person-circle-outline" size={16} color="white" />
                <Text style={{ color: "white", fontWeight: "800" }}>Complete Profile</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Consultation type */}
          <SectionTitle>Consultation Type</SectionTitle>
          <Row>
            {(["onsite", "online"] as ConsultationType[]).map((type) => (
              <SelectCard
                key={type}
                active={consultationType === type}
                icon={type === "online" ? "videocam-outline" : "medkit-outline"}
                label={tr(type, lang)}
                sub={type === "online" ? tr("online_sub", lang) : tr("onsite_sub", lang)}
                onPress={() => setConsultationType(type)}
              />
            ))}
          </Row>

          {/* RHU */}
          <SectionTitle>Choose RHU</SectionTitle>
          <Row>
            {RHU_OPTIONS.map((o) => (
              <SelectCard
                key={o.id}
                active={rhuId === o.id}
                icon="business-outline"
                label={o.label}
                sub={o.sub}
                onPress={() => setRhuId(o.id)}
              />
            ))}
          </Row>

          {/* Schedule */}
          <SectionTitle>Schedule</SectionTitle>
          <FieldLabel>Consultation Date</FieldLabel>
          <PickerButton
            icon="calendar-outline"
            value={formatDateLabel(consultationDate)}
            onPress={() => setActivePicker("consultation")}
          />
          <View style={{ height: 12 }} />
          <FieldLabel>Preferred Time</FieldLabel>
          <PickerButton
            icon="time-outline"
            value={formatTimeLabel(preferredTime)}
            onPress={() => setActivePicker("time")}
          />

          {/* Identity */}
          <SectionTitle>Patient Identity</SectionTitle>
          <View style={{ marginBottom: 12 }}>
            <FieldLabel>PhilHealth Number (OCR verified)</FieldLabel>

            <View
              style={{
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="card-outline" size={18} color="#0D9488" />
              <Text style={{ flex: 1, fontSize: 16, color: philhealth ? "#111827" : "#9CA3AF", fontWeight: "700" }}>
                {philhealth
                  ? philhealthShown
                    ? philhealth
                    : maskPhilHealth(philhealth)
                  : "Not yet scanned"}
              </Text>

              {philhealth ? (
                <TouchableOpacity onPress={() => setPhilhealthShown((s) => !s)} hitSlop={8}>
                  <Ionicons
                    name={philhealthShown ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={onScanPhilHealth}
                disabled={philhealthScanning}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: philhealthScanning ? "#9CA3AF" : "#0D9488",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                {philhealthScanning ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="scan-outline" size={18} color="white" />
                )}
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {philhealthScanning ? "Scanning…" : "Scan PhilHealth ID"}
                </Text>
              </TouchableOpacity>

              {philhealthVerified ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#047857" />
                  <Text style={{ color: "#047857", fontWeight: "800", fontSize: 13 }}>Verified</Text>
                </View>
              ) : philhealth ? (
                <Text style={{ color: "#B45309", fontWeight: "700", fontSize: 12, flex: 1 }}>
                  Not verified — scan your ID to verify.
                </Text>
              ) : null}
            </View>
          </View>
          <LabeledInput label="First Name *" value={firstName} onChangeText={setFirstName} />
          <LabeledInput label="Middle Name" value={middleName} onChangeText={setMiddleName} />
          <LabeledInput label="Last Name *" value={lastName} onChangeText={setLastName} />

          <FieldLabel>Birth Date *</FieldLabel>
          <PickerButton
            icon="calendar-outline"
            value={birthDate ? formatDateLabel(birthDate) : "Select birth date"}
            onPress={() => setActivePicker("birth")}
          />
          <View style={{ height: 12 }} />
          <LabeledInput label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />

          <FieldLabel>Gender / Sex *</FieldLabel>
          <ChipSelect options={GENDER_OPTIONS} value={gender} onChange={setGender} />

          <FieldLabel>Civil Status *</FieldLabel>
          <ChipSelect options={CIVIL_STATUS_OPTIONS} value={civilStatus} onChange={setCivilStatus} />

          <LabeledInput label="Religion" value={religion} onChangeText={setReligion} />
          <LabeledInput label="Educational Attainment" value={education} onChangeText={setEducation} />

          <FieldLabel>Blood Type</FieldLabel>
          <ChipSelect options={BLOOD_TYPE_OPTIONS} value={bloodType} onChange={setBloodType} />

          {/* Guardian */}
          <SectionTitle>Guardian</SectionTitle>
          <LabeledInput label="Guardian's Name" value={guardianName} onChangeText={setGuardianName} />
          <FieldLabel>Guardian's Birthdate</FieldLabel>
          <PickerButton
            icon="calendar-outline"
            value={guardianBirthdate ? formatDateLabel(guardianBirthdate) : "Select date"}
            onPress={() => setActivePicker("guardian")}
          />

          {/* History / lifestyle */}
          <SectionTitle>Personal / Social History</SectionTitle>
          <LabeledInput label="Personal / Social History" value={personalSocial} onChangeText={setPersonalSocial} multiline />
          <CheckRow label="Smoking" checked={smoking} onToggle={() => setSmoking((s) => !s)} />
          <CheckRow label="Alcohol Intake" checked={alcohol} onToggle={() => setAlcohol((s) => !s)} />
          <LabeledInput label="Past Medical History" value={pastMedical} onChangeText={setPastMedical} multiline />
          <LabeledInput label="Allergies" value={allergies} onChangeText={setAllergies} multiline />
          <LabeledInput label="Maintenance Medications" value={maintenance} onChangeText={setMaintenance} multiline />

          {/* Female-only */}
          {isFemale ? (
            <>
              <SectionTitle>Female Health Information</SectionTitle>
              <LabeledInput label="Number of Children" value={numChildren} onChangeText={setNumChildren} keyboardType="number-pad" />
              <FieldLabel>LMP (Last Menstrual Period)</FieldLabel>
              <PickerButton
                icon="calendar-outline"
                value={lmp ? formatDateLabel(lmp) : "Select date"}
                onPress={() => setActivePicker("lmp")}
              />
              <View style={{ height: 12 }} />
              <LabeledInput label="Period Duration" value={periodDuration} onChangeText={setPeriodDuration} />
              <LabeledInput label="Cycle" value={cycle} onChangeText={setCycle} />
              <LabeledInput label="Family Planning Method" value={fpMethod} onChangeText={setFpMethod} />
              <LabeledInput label="Menopausal Age" value={menopausalAge} onChangeText={setMenopausalAge} keyboardType="number-pad" />
            </>
          ) : null}

          {/* Chief complaint */}
          <SectionTitle>Chief Complaint / Reason for Consultation *</SectionTitle>
          <LabeledInput
            label="Describe your reason for consultation"
            value={reason}
            onChangeText={setReason}
            multiline
          />

          {activePicker ? (
            <DateTimePicker
              value={pickerValueFor()}
              mode={activePicker === "time" ? "time" : "date"}
              display={
                Platform.OS === "ios"
                  ? activePicker === "time"
                    ? "spinner"
                    : "inline"
                  : "default"
              }
              minimumDate={activePicker === "consultation" ? new Date() : undefined}
              onChange={onPickerChange}
            />
          ) : null}

          {Platform.OS === "ios" && activePicker ? (
            <TouchableOpacity
              onPress={() => setActivePicker(null)}
              style={{
                marginTop: 8,
                alignSelf: "flex-end",
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: "#ECFDF5",
              }}
            >
              <Text style={{ color: "#0D9488", fontWeight: "800" }}>Done</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
            style={{
              marginTop: 22,
              backgroundColor: submitting ? "#9CA3AF" : "#0D9488",
              borderRadius: 18,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="send-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: "white", fontWeight: "900", fontSize: 20 }}>
                  {tr("submit_appt", lang)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- small presentational helpers ---------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontWeight: "900",
        color: "#0F172A",
        fontSize: 17,
        marginTop: 20,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontWeight: "800", color: "#374151", marginBottom: 6, fontSize: 15 }}>
      {children}
    </Text>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>{children}</View>;
}

function LabeledInput({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#9CA3AF"
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          backgroundColor: "white",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: "#111827",
          minHeight: multiline ? 90 : undefined,
        }}
      />
    </View>
  );
}

function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {options.map((opt) => {
        const active = value.trim().toLowerCase() === opt.toLowerCase();
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: active ? "#0D9488" : "#E5E7EB",
              backgroundColor: active ? "#0D9488" : "white",
            }}
          >
            <Text style={{ color: active ? "white" : "#111827", fontWeight: "800" }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? "#0D9488" : "#CBD5E1",
          backgroundColor: checked ? "#0D9488" : "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <Ionicons name="checkmark" size={16} color="white" /> : null}
      </View>
      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PickerButton({
  icon,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <Ionicons name={icon} size={20} color="#0D9488" style={{ marginRight: 8 }} />
      <Text style={{ flex: 1, color: "#111827", fontSize: 16, fontWeight: "700" }}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

function SelectCard({
  active,
  icon,
  label,
  sub,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        backgroundColor: active ? "#0D9488" : "white",
        borderWidth: 1,
        borderColor: active ? "#0D9488" : "#E5E7EB",
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: active ? "#14B8A6" : "#ECFDF5",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={23} color={active ? "#FFFFFF" : "#0D9488"} />
      </View>
      <Text
        style={{
          color: active ? "white" : "#111827",
          fontWeight: "900",
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: active ? "#CCFBF1" : "#6B7280",
          fontSize: 13,
          marginTop: 2,
          textAlign: "center",
        }}
      >
        {sub}
      </Text>
    </TouchableOpacity>
  );
}

const infoCard = {
  backgroundColor: "#ECFDF5",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "#A7F3D0" as const,
  alignItems: "center" as const,
};

const warnBanner = {
  backgroundColor: "#FFFBEB",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "#FDE68A" as const,
  marginTop: 12,
};
