// app/feedback/new.tsx
// Ka-Agapay Mobile — Health Follow-up screen
// The patient reports their medical condition after a completed consultation.

import React, { useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  submitFeedback,
  type ConditionStatus,
  type MedicationTaken,
  type UrgencyLevel,
} from "../../services/api/feedback";

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toPositiveNumber(value: string): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function ratingFromCondition(condition: ConditionStatus | null): number | undefined {
  switch (condition) {
    case "recovered":
      return 5;
    case "improved":
      return 4;
    case "same":
      return 3;
    case "worse":
      return 1;
    default:
      return undefined;
  }
}

type ChoiceOption<T> = { value: T; label: string };

function ChoiceGroup<T>({
  options,
  selected,
  onSelect,
}: {
  options: ChoiceOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {options.map((option) => {
        const active = selected === option.value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.85}
            style={{
              flexGrow: 1,
              minWidth: "45%",
              backgroundColor: active ? "#0D9488" : "#FFFFFF",
              borderWidth: 1,
              borderColor: active ? "#0D9488" : "#E5E7EB",
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : "#111827",
                fontWeight: "800",
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function QuestionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontWeight: "900",
        color: "#374151",
        fontSize: 17,
        marginBottom: 10,
        marginTop: 18,
      }}
    >
      {children}
    </Text>
  );
}

export default function HealthFollowupScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    consultation_id?: string | string[];
    appointment_id?: string | string[];
    service_type?: string | string[];
  }>();

  const consultationId = toPositiveNumber(firstParam(params.consultation_id));
  const appointmentId = toPositiveNumber(firstParam(params.appointment_id));
  const serviceType = firstParam(params.service_type) || "health_followup";

  const [conditionStatus, setConditionStatus] =
    useState<ConditionStatus | null>(null);
  const [symptomsPresent, setSymptomsPresent] = useState<boolean | null>(null);
  const [medicationTaken, setMedicationTaken] =
    useState<MedicationTaken | null>(null);
  const [sideEffects, setSideEffects] = useState<boolean | null>(null);
  const [sideEffectsDescription, setSideEffectsDescription] = useState("");
  const [needsFollowUp, setNeedsFollowUp] = useState<boolean | null>(null);
  const [patientMessage, setPatientMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function computeUrgency(): UrgencyLevel {
    if (conditionStatus === "worse" && needsFollowUp) return "urgent";
    if (conditionStatus === "worse" || sideEffects === true) return "watch";
    return "routine";
  }

  const submit = async () => {
    if (!conditionStatus) {
      Alert.alert(
        "Required",
        "Please tell us how you are feeling after your consultation."
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback({
        service_type: serviceType,
        followup_type: "medical_followup",
        condition_status: conditionStatus,
        symptoms_present: symptomsPresent,
        medication_taken: medicationTaken,
        side_effects: sideEffects,
        side_effects_description:
          sideEffects === true ? sideEffectsDescription.trim() || null : null,
        needs_follow_up: needsFollowUp,
        urgency_level: computeUrgency(),
        patient_message: patientMessage.trim() || null,
        rating: ratingFromCondition(conditionStatus),
        consultation_id: consultationId,
        appointment_id: appointmentId,
      });

      Alert.alert(
        "Thank you!",
        "Thank you. Your health follow-up has been submitted to the RHU.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        "Could not submit",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to submit your health follow-up. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#0D9488",
          paddingTop: 56,
          paddingBottom: 18,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "900" }}>
            Health Follow-up
          </Text>

          <View style={{ width: 28 }} />
        </View>

        <Text
          style={{
            color: "#CCFBF1",
            textAlign: "center",
            marginTop: 8,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          Tell the RHU how you are feeling after your consultation.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Q1 */}
          <QuestionTitle>
            How are you feeling after your consultation?
          </QuestionTitle>
          <ChoiceGroup<ConditionStatus>
            selected={conditionStatus}
            onSelect={setConditionStatus}
            options={[
              { value: "recovered", label: "Recovered" },
              { value: "improved", label: "Improved" },
              { value: "same", label: "Same" },
              { value: "worse", label: "Worse" },
            ]}
          />

          {/* Q2 */}
          <QuestionTitle>Are you still experiencing symptoms?</QuestionTitle>
          <ChoiceGroup<boolean>
            selected={symptomsPresent}
            onSelect={setSymptomsPresent}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
          />

          {/* Q3 */}
          <QuestionTitle>Did you take the prescribed medicine?</QuestionTitle>
          <ChoiceGroup<MedicationTaken>
            selected={medicationTaken}
            onSelect={setMedicationTaken}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not_prescribed", label: "No medicine prescribed" },
            ]}
          />

          {/* Q4 */}
          <QuestionTitle>Did you experience side effects?</QuestionTitle>
          <ChoiceGroup<boolean>
            selected={sideEffects}
            onSelect={setSideEffects}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
          />

          {sideEffects === true ? (
            <View
              style={{
                backgroundColor: "white",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginTop: 10,
              }}
            >
              <TextInput
                value={sideEffectsDescription}
                onChangeText={setSideEffectsDescription}
                placeholder="Describe the side effects."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 90,
                  color: "#111827",
                  fontSize: 16,
                  lineHeight: 22,
                }}
              />
            </View>
          ) : null}

          {/* Q5 */}
          <QuestionTitle>Do you need another RHU follow-up?</QuestionTitle>
          <ChoiceGroup<boolean>
            selected={needsFollowUp}
            onSelect={setNeedsFollowUp}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
          />

          {/* Message */}
          <QuestionTitle>Message to RHU staff (optional)</QuestionTitle>
          <View
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={patientMessage}
              onChangeText={setPatientMessage}
              placeholder="Tell the RHU about your current condition..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 110,
                color: "#111827",
                fontSize: 16,
                lineHeight: 22,
              }}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
            style={{
              marginTop: 24,
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
                <Ionicons
                  name="send-outline"
                  size={22}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: "white", fontWeight: "900", fontSize: 19 }}>
                  Submit Health Follow-up
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
