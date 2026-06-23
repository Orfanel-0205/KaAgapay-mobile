// app/appointments/[id].tsx
// Ka-Agapay Mobile Resident Appointment Details Screen

import React, { useCallback, useState } from "react";
import {
View,
Text,
ScrollView,
TouchableOpacity,
ActivityIndicator,
Alert,
RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
useFocusEffect,
useLocalSearchParams,
useRouter,
} from "expo-router";
import {
fetchAppointment,
cancelAppointment,
getAppointmentDisplayType,
getAppointmentReason,
getAppointmentSymptoms,
type Appointment,
} from "../../services/api/appointments";

function formatDate(value?: string | null) {
if (!value) return "—";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "—";
}

return date.toLocaleDateString("en-PH", {
month: "long",
day: "numeric",
year: "numeric",
});
}

function formatTime(value?: string | null) {
if (!value) return "—";

return String(value).slice(0, 5);
}

function getStatusColors(status?: string | null) {
const value = String(status || "pending").toLowerCase();

if (value === "pending") {
return {
bg: "#FEF3C7",
text: "#92400E",
border: "#FDE68A",
};
}

if (
value === "confirmed" ||
value === "approved" ||
value === "scheduled"
) {
return {
bg: "#DCFCE7",
text: "#166534",
border: "#BBF7D0",
};
}

if (value === "completed") {
return {
bg: "#DBEAFE",
text: "#1D4ED8",
border: "#BFDBFE",
};
}

if (value === "cancelled" || value === "rejected") {
return {
bg: "#FEE2E2",
text: "#991B1B",
border: "#FECACA",
};
}

return {
bg: "#F3F4F6",
text: "#374151",
border: "#E5E7EB",
};
}

function InfoCard({
title,
value,
icon,
}: {
title: string;
value?: string | null;
icon: keyof typeof Ionicons.glyphMap;
}) {
return (
<View
style={{
backgroundColor: "white",
borderRadius: 18,
padding: 16,
borderWidth: 1,
borderColor: "#E5E7EB",
marginBottom: 12,
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
width: 38,
height: 38,
borderRadius: 13,
backgroundColor: "#ECFDF5",
alignItems: "center",
justifyContent: "center",
marginRight: 10,
}}
> <Ionicons name={icon} size={22} color="#0D9488" /> </View>


    <Text
      style={{
        fontSize: 17,
        fontWeight: "900",
        color: "#111827",
        flex: 1,
      }}
    >
      {title}
    </Text>
  </View>

  <Text
    style={{
      color: "#374151",
      marginTop: 10,
      lineHeight: 22,
      fontSize: 15,
    }}
  >
    {value || "—"}
  </Text>
</View>


);
}

export default function AppointmentDetailsScreen() {
const router = useRouter();

const params = useLocalSearchParams<{
id?: string | string[];
}>();

const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
const id = rawId ? String(rawId) : "";

const [appointment, setAppointment] = useState<Appointment | null>(null);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [cancelling, setCancelling] = useState(false);

const load = useCallback(async () => {
if (!id) {
setAppointment(null);
setLoading(false);
setRefreshing(false);
return;
}


try {
  const data = await fetchAppointment(id);
  setAppointment(data);
} catch (error: any) {
  Alert.alert(
    "Error",
    error?.response?.data?.message ||
      error?.message ||
      "Failed to load appointment."
  );
} finally {
  setLoading(false);
  setRefreshing(false);
}


}, [id]);

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

const handleCancel = () => {
if (!appointment) return;


Alert.alert("Cancel appointment?", "This action will cancel your request.", [
  {
    text: "No",
    style: "cancel",
  },
  {
    text: "Cancel Appointment",
    style: "destructive",
    onPress: async () => {
      setCancelling(true);

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
      } finally {
        setCancelling(false);
      }
    },
  },
]);


};

const renderHeader = () => {
return (
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
hitSlop={{
top: 8,
bottom: 8,
left: 8,
right: 8,
}}
> <Ionicons name="chevron-back" size={28} color="#FFFFFF" /> </TouchableOpacity>


      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 22,
          fontWeight: "900",
        }}
      >
        Appointment
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
      Schedule, status, reason, and request details
    </Text>
  </View>
);


};

if (loading) {
return (
<View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
{renderHeader()}


    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#0D9488" />

      <Text
        style={{
          color: "#6B7280",
          marginTop: 10,
        }}
      >
        Loading appointment...
      </Text>
    </View>
  </View>
);


}

if (!appointment) {
return (
<View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
{renderHeader()}


    <View
      style={{
        flex: 1,
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="alert-circle-outline" size={46} color="#DC2626" />

      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: "#111827",
          marginTop: 10,
          textAlign: "center",
        }}
      >
        Appointment not found.
      </Text>
    </View>
  </View>
);


}

const type = getAppointmentDisplayType(appointment);
const reason = getAppointmentReason(appointment);
const symptoms = getAppointmentSymptoms(appointment);
const status = appointment.status || "pending";
const colors = getStatusColors(status);
const typeIsOnline = type === "online";

const scheduleText =
formatDate(appointment.appointment_date) +
" · " +
formatTime(appointment.appointment_time);

const titleText = "Appointment #" + String(appointment.id);

const consultationText = appointment.consultation
? "Consultation #" +
String(appointment.consultation.id) +
" is available."
: "";

return (
<View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
{renderHeader()}


  <ScrollView
    contentContainerStyle={{
      padding: 16,
      paddingBottom: 120,
    }}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
  >
    <View
      style={{
        backgroundColor: typeIsOnline ? "#EFF6FF" : "#ECFDF5",
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: typeIsOnline ? "#BFDBFE" : "#A7F3D0",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: typeIsOnline ? "#2563EB" : "#0D9488",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name={typeIsOnline ? "videocam-outline" : "medkit-outline"}
            size={26}
            color="#FFFFFF"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              color: typeIsOnline ? "#2563EB" : "#0D9488",
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            {type + " consultation"}
          </Text>

          <Text
            style={{
              color: "#374151",
              marginTop: 2,
            }}
          >
            {scheduleText}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 26,
          fontWeight: "900",
          color: "#111827",
          marginTop: 6,
        }}
      >
        {titleText}
      </Text>

      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 13,
            fontWeight: "900",
            textTransform: "uppercase",
          }}
        >
          {status}
        </Text>
      </View>
    </View>

    <InfoCard title="Schedule" value={scheduleText} icon="calendar-outline" />

    <InfoCard
      title="Consultation Type"
      value={typeIsOnline ? "Online Consultation" : "Onsite Consultation"}
      icon={typeIsOnline ? "videocam-outline" : "medkit-outline"}
    />

    <InfoCard title="Reason" value={reason} icon="chatbubble-ellipses-outline" />

    <InfoCard title="Symptoms" value={symptoms} icon="pulse-outline" />

    {!!appointment.notes && (
      <InfoCard title="Notes" value={appointment.notes} icon="document-text-outline" />
    )}

    {!!appointment.rejection_reason && (
      <InfoCard
        title="Rejection Reason"
        value={appointment.rejection_reason}
        icon="alert-circle-outline"
      />
    )}

    {!!appointment.consultation && (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          const route =
            "/consultations/" + String(appointment.consultation?.id);
          router.push(route as any);
        }}
        style={{
          backgroundColor: "#ECFDF5",
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: "#A7F3D0",
          marginBottom: 12,
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
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: "#0D9488",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="medical-outline" size={22} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "900",
                color: "#111827",
              }}
            >
              Consultation Record
            </Text>

            <Text
              style={{
                color: "#374151",
                marginTop: 4,
                lineHeight: 21,
              }}
            >
              {consultationText}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#0D9488" />
        </View>
      </TouchableOpacity>
    )}

    {status === "pending" ? (
      <TouchableOpacity
        onPress={handleCancel}
        disabled={cancelling}
        activeOpacity={0.85}
        style={{
          marginTop: 8,
          backgroundColor: cancelling ? "#9CA3AF" : "#EF4444",
          borderRadius: 18,
          paddingVertical: 15,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        {cancelling ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="close-circle-outline"
              size={23}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />

            <Text
              style={{
                color: "white",
                fontWeight: "900",
                fontSize: 17,
              }}
            >
              Cancel Appointment
            </Text>
          </>
        )}
      </TouchableOpacity>
    ) : null}
  </ScrollView>
</View>


);
}
