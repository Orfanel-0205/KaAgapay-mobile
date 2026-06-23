// app/appointments/create.tsx
// Ka-Agapay Mobile Resident Create Appointment Screen

import React, { useState } from "react";
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
import ScreenHeader from "../../Components/ScreenHeader";
import {
createAppointment,
type ConsultationType,
} from "../../services/api/appointments";
import { tr, useLang } from "../../constants/i18n";

function todayString() {
return new Date().toISOString().slice(0, 10);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
return (
<Text
style={{
fontWeight: "800",
color: "#374151",
marginBottom: 6,
fontSize: 17,
}}
>
{children} </Text>
);
}

function HelperCard() {
return (
<View
style={{
backgroundColor: "#ECFDF5",
borderRadius: 18,
padding: 14,
borderWidth: 1,
borderColor: "#A7F3D0",
marginBottom: 16,
}}
>
<View
style={{
flexDirection: "row",
alignItems: "flex-start",
}}
>
<View
style={{
width: 38,
height: 38,
borderRadius: 13,
backgroundColor: "#0D9488",
alignItems: "center",
justifyContent: "center",
marginRight: 10,
}}
> <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" /> </View>


    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: "#0F766E",
          fontSize: 17,
          fontWeight: "900",
        }}
      >
        Appointment Request
      </Text>

      <Text
        style={{
          color: "#374151",
          marginTop: 4,
          lineHeight: 21,
          fontSize: 15,
        }}
      >
        Your request will be reviewed by RHU staff. You will receive an update once it is approved or scheduled.
      </Text>
    </View>
  </View>
</View>


);
}

export default function CreateAppointmentScreen() {
const router = useRouter();
const lang = useLang();

const [consultationType, setConsultationType] =
useState<ConsultationType>("onsite");

const [rhuId, setRhuId] = useState<number>(1);
const [reason, setReason] = useState("");
const [symptoms, setSymptoms] = useState("");
const [preferredDate, setPreferredDate] = useState(todayString());
const [preferredTime, setPreferredTime] = useState("09:00");
const [submitting, setSubmitting] = useState(false);

const RHU_OPTIONS = [
{ id: 1, label: "RHU 1", sub: "Poblacion / Main RHU" },
{ id: 2, label: "RHU 2", sub: "Secondary RHU" },
];

const submit = async () => {
if (!reason.trim()) {
Alert.alert("Required", "Please enter your reason for consultation.");
return;
}


if (!preferredDate.trim()) {
  Alert.alert("Required", "Please enter your preferred date.");
  return;
}

setSubmitting(true);

try {
  const appointment = await createAppointment({
    consultation_type: consultationType,
    rhu_id: rhuId,
    reason: reason.trim(),
    symptoms: symptoms.trim(),
    preferred_date: preferredDate.trim(),
    preferred_time: preferredTime.trim() || undefined,
  });

  Alert.alert("Success", "Appointment request submitted.", [
    {
      text: "View Appointment",
      onPress: () => {
        const appointmentRoute = "/appointments/" + String(appointment.id);
        router.replace(appointmentRoute as any);
      },
    },
  ]);
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
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 120,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <HelperCard />

      <Text
        style={{
          fontWeight: "900",
          color: "#374151",
          marginBottom: 8,
          marginTop: 4,
          fontSize: 18,
        }}
      >
        {tr("consultation_type", lang)}
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
        {(["onsite", "online"] as ConsultationType[]).map((type) => {
          const active = consultationType === type;
          const isOnline = type === "online";

          return (
            <TouchableOpacity
              key={type}
              onPress={() => setConsultationType(type)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: active ? "#0D9488" : "white",
                borderWidth: 1,
                borderColor: active ? "#0D9488" : "#E5E7EB",
                borderRadius: 18,
                padding: 16,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  backgroundColor: active ? "#14B8A6" : "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name={isOnline ? "videocam-outline" : "medkit-outline"}
                  size={25}
                  color={active ? "#FFFFFF" : "#0D9488"}
                />
              </View>

              <Text
                style={{
                  color: active ? "white" : "#111827",
                  fontWeight: "900",
                  fontSize: 20,
                  textAlign: "center",
                }}
              >
                {tr(type, lang)}
              </Text>

              <Text
                style={{
                  color: active ? "#CCFBF1" : "#6B7280",
                  fontSize: 16,
                  marginTop: 4,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {isOnline ? tr("online_sub", lang) : tr("onsite_sub", lang)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text
        style={{
          fontWeight: "900",
          color: "#374151",
          marginBottom: 8,
          marginTop: 4,
          fontSize: 18,
        }}
      >
        Choose RHU
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
        {RHU_OPTIONS.map((option) => {
          const active = rhuId === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => setRhuId(option.id)}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: active ? "#0D9488" : "white",
                borderWidth: 1,
                borderColor: active ? "#0D9488" : "#E5E7EB",
                borderRadius: 18,
                padding: 16,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  backgroundColor: active ? "#14B8A6" : "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={25}
                  color={active ? "#FFFFFF" : "#0D9488"}
                />
              </View>

              <Text
                style={{
                  color: active ? "white" : "#111827",
                  fontWeight: "900",
                  fontSize: 20,
                  textAlign: "center",
                }}
              >
                {option.label}
              </Text>

              <Text
                style={{
                  color: active ? "#CCFBF1" : "#6B7280",
                  fontSize: 15,
                  marginTop: 4,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {option.sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ gap: 14 }}>
        <View>
          <FieldLabel>{tr("reason_label", lang)}</FieldLabel>

          <View
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#0D9488"
              style={{ marginRight: 8 }}
            />

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={tr("reason_ph", lang)}
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                paddingVertical: 13,
                color: "#111827",
                fontSize: 16,
              }}
            />
          </View>
        </View>

        <View>
          <FieldLabel>{tr("symptoms_label", lang)}</FieldLabel>

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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Ionicons
                name="pulse-outline"
                size={22}
                color="#0D9488"
                style={{ marginRight: 8 }}
              />

              <Text
                style={{
                  color: "#6B7280",
                  fontWeight: "700",
                }}
              >
                Symptoms or concern details
              </Text>
            </View>

            <TextInput
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder={tr("symptoms_ph", lang)}
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
        </View>

        <View>
          <FieldLabel>{tr("preferred_date", lang)}</FieldLabel>

          <View
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color="#0D9488"
              style={{ marginRight: 8 }}
            />

            <TextInput
              value={preferredDate}
              onChangeText={setPreferredDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={{
                flex: 1,
                paddingVertical: 13,
                color: "#111827",
                fontSize: 16,
              }}
            />
          </View>
        </View>

        <View>
          <FieldLabel>{tr("preferred_time", lang)}</FieldLabel>

          <View
            style={{
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
            }}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color="#0D9488"
              style={{ marginRight: 8 }}
            />

            <TextInput
              value={preferredTime}
              onChangeText={setPreferredTime}
              placeholder="09:00"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={{
                flex: 1,
                paddingVertical: 13,
                color: "#111827",
                fontSize: 16,
              }}
            />
          </View>
        </View>
      </View>

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
            <Ionicons
              name="send-outline"
              size={23}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />

            <Text
              style={{
                color: "white",
                fontWeight: "900",
                fontSize: 23,
              }}
            >
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
