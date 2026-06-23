// app/appointments/index.tsx
// Ka-Agapay Mobile Resident Appointments List Screen

import React, { useCallback, useMemo, useState } from "react";
import {
View,
Text,
ScrollView,
TouchableOpacity,
RefreshControl,
ActivityIndicator,
Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenHeader from "../../Components/ScreenHeader";
import {
fetchMyAppointments,
cancelAppointment,
getAppointmentDisplayType,
getAppointmentReason,
type Appointment,
} from "../../services/api/appointments";
import { tr, useLang } from "../../constants/i18n";

const statusColor: Record<string, string> = {
pending: "#F59E0B",
confirmed: "#10B981",
approved: "#10B981",
scheduled: "#0D9488",
completed: "#2563EB",
cancelled: "#EF4444",
rejected: "#991B1B",
};

function formatDate(value?: string | null) {
if (!value) return "No date";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "No date";
}

return date.toLocaleDateString("en-PH", {
month: "short",
day: "numeric",
year: "numeric",
});
}

function formatTime(value?: string | null) {
if (!value) return "No time";

return String(value).slice(0, 5);
}

function getTitle(appointment: Appointment) {
const type = getAppointmentDisplayType(appointment);

return type === "online" ? "Online Consultation" : "Onsite Consultation";
}

function getStatusSoftColor(color: string) {
return color + "22";
}

export default function AppointmentsIndexScreen() {
const router = useRouter();
const lang = useLang();

const [appointments, setAppointments] = useState<Appointment[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const load = useCallback(async () => {
try {
const data = await fetchMyAppointments();
setAppointments(Array.isArray(data) ? data : []);
} catch (error: any) {
Alert.alert(
"Error",
error?.response?.data?.message ||
error?.message ||
"Failed to load appointments."
);
} finally {
setLoading(false);
setRefreshing(false);
}
}, []);

useFocusEffect(
useCallback(() => {
setLoading(true);
load();
}, [load])
);

const onRefresh = () => {
setRefreshing(true);
load();
};

const sortedAppointments = useMemo(() => {
return [...appointments].sort((a, b) => {
const aDate = String(a.appointment_date || "") + " " + String(a.appointment_time || "");
const bDate = String(b.appointment_date || "") + " " + String(b.appointment_time || "");


  return new Date(bDate).getTime() - new Date(aDate).getTime();
});


}, [appointments]);

const handleCancel = (appointment: Appointment) => {
Alert.alert(
"Cancel appointment?",
"This will mark your appointment as cancelled.",
[
{
text: "No",
style: "cancel",
},
{
text: "Yes, cancel",
style: "destructive",
onPress: async () => {
try {
await cancelAppointment(appointment.id);
await load();
} catch (error: any) {
Alert.alert(
"Error",
error?.response?.data?.message ||
error?.message ||
"Failed to cancel."
);
}
},
},
]
);
};

return (
<View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
<ScreenHeader
title={tr("appts_title", lang)}
subtitle={tr("appts_subtitle", lang)}
/>


  <ScrollView
    contentContainerStyle={{
      padding: 16,
      paddingBottom: 120,
    }}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
  >
    <TouchableOpacity
      onPress={() => router.push("/appointments/create" as any)}
      activeOpacity={0.85}
      style={{
        backgroundColor: "#0D9488",
        borderRadius: 18,
        padding: 16,
        marginBottom: 18,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: "#14B8A6",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name="add-circle-outline" size={27} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "white",
              fontWeight: "800",
              fontSize: 23,
            }}
          >
            {tr("book_new_appt", lang)}
          </Text>

          <Text
            style={{
              color: "#CCFBF1",
              marginTop: 4,
              fontSize: 20,
            }}
          >
            {tr("book_new_appt_sub", lang)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={25} color="#FFFFFF" />
      </View>
    </TouchableOpacity>

    {loading ? (
      <View
        style={{
          paddingVertical: 60,
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#0D9488" />

        <Text style={{ color: "#6B7280", marginTop: 10 }}>
          Loading appointments...
        </Text>
      </View>
    ) : sortedAppointments.length === 0 ? (
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 18,
          padding: 24,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Ionicons name="calendar-outline" size={44} color="#9CA3AF" />

        <Text
          style={{
            fontSize: 23,
            fontWeight: "700",
            color: "#374151",
            marginTop: 10,
            textAlign: "center",
          }}
        >
          {tr("empty_appts_title", lang)}
        </Text>

        <Text
          style={{
            fontSize: 20,
            color: "#6B7280",
            marginTop: 6,
            textAlign: "center",
            lineHeight: 25,
          }}
        >
          {tr("empty_appts_body", lang)}
        </Text>
      </View>
    ) : (
      sortedAppointments.map((item) => {
        const type = getAppointmentDisplayType(item);
        const status = item.status || "pending";
        const color = statusColor[status] || "#6B7280";
        const typeIsOnline = type === "online";
        const appointmentRoute = "/appointments/" + String(item.id);

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push(appointmentRoute as any)}
            activeOpacity={0.85}
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: typeIsOnline ? "#EFF6FF" : "#ECFDF5",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons
                      name={typeIsOnline ? "videocam-outline" : "medkit-outline"}
                      size={24}
                      color={typeIsOnline ? "#2563EB" : "#0D9488"}
                    />
                  </View>

                  <Text
                    style={{
                      fontSize: 23,
                      fontWeight: "800",
                      color: "#111827",
                      flex: 1,
                    }}
                  >
                    {getTitle(item)}
                  </Text>
                </View>

                <Text
                  numberOfLines={2}
                  style={{
                    color: "#6B7280",
                    marginTop: 4,
                    lineHeight: 22,
                    fontSize: 15,
                  }}
                >
                  {getAppointmentReason(item)}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#6B7280"
                    style={{ marginRight: 5 }}
                  />

                  <Text
                    style={{
                      color: "#6B7280",
                      fontSize: 15,
                    }}
                  >
                    {formatDate(item.appointment_date) +
                      " · " +
                      formatTime(item.appointment_time)}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: typeIsOnline ? "#EFF6FF" : "#ECFDF5",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      color: typeIsOnline ? "#2563EB" : "#0D9488",
                      fontSize: 18,
                      fontWeight: "900",
                      textTransform: "uppercase",
                    }}
                  >
                    {type}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: getStatusSoftColor(color),
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      color,
                      fontSize: 18,
                      fontWeight: "900",
                      textTransform: "uppercase",
                    }}
                  >
                    {status}
                  </Text>
                </View>
              </View>
            </View>

            {status === "pending" && (
              <TouchableOpacity
                onPress={() => handleCancel(item)}
                style={{
                  marginTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                  paddingTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />

                <Text
                  style={{
                    color: "#EF4444",
                    fontWeight: "800",
                  }}
                >
                  Cancel Appointment
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })
    )}
  </ScrollView>
</View>


);
}
