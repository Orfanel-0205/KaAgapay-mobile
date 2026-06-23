// app/consultations/[id].tsx
// Ka-Agapay Mobile Resident Consultation Details Screen

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchConsultation,
  getConsultationDate,
  getConsultationDoctorName,
  getConsultationTreatment,
  type Consultation,
} from "../../services/api/consultations";

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

function getStatusColors(status?: string | null) {
  const value = String(status || "open").toLowerCase();

  if (value === "completed") {
    return {
      bg: "#DCFCE7",
      text: "#166534",
      border: "#BBF7D0",
    };
  }

  if (value === "cancelled") {
    return {
      bg: "#FEE2E2",
      text: "#B91C1C",
      border: "#FECACA",
    };
  }

  if (value === "ongoing") {
    return {
      bg: "#DBEAFE",
      text: "#1D4ED8",
      border: "#BFDBFE",
    };
  }

  return {
    bg: "#FEF3C7",
    text: "#92400E",
    border: "#FDE68A",
  };
}

function displayValue(value?: unknown): string {
  const text = String(value ?? "").trim();
  return text || "—";
}

function Section({
  title,
  icon,
  value,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: unknown;
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
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: "#ECFDF5",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={21} color="#0D9488" />
        </View>

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
        {displayValue(value)}
      </Text>
    </View>
  );
}

export default function ConsultationDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = rawId ? String(rawId) : "";

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setConsultation(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await fetchConsultation(id);
      setConsultation(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load consultation."
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
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: "900",
            }}
          >
            Consultation
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
          SOAP notes, diagnosis, and treatment details
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
            Loading consultation...
          </Text>
        </View>
      </View>
    );
  }

  if (!consultation) {
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
            Consultation not found.
          </Text>
        </View>
      </View>
    );
  }

  const doctorName = getConsultationDoctorName(consultation);
  const consultationDate = getConsultationDate(consultation);
  const treatment = getConsultationTreatment(consultation);
  const status = consultation.status || "open";
  const colors = getStatusColors(status);
  const isCompleted = String(status).toLowerCase() === "completed";

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
            backgroundColor: "#ECFDF5",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "#A7F3D0",
            marginBottom: 16,
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
                width: 44,
                height: 44,
                borderRadius: 15,
                backgroundColor: "#0D9488",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons name="medical" size={25} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#0D9488",
                  fontWeight: "900",
                  fontSize: 12,
                }}
              >
                CONSULTATION RECORD
              </Text>

              <Text
                style={{
                  color: "#374151",
                  marginTop: 2,
                }}
              >
                {formatDate(consultationDate)}
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
            {doctorName}
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

        <Section
          title="Chief Complaint"
          icon="chatbubble-ellipses-outline"
          value={
            consultation.chief_complaint ||
            consultation.subjective ||
            consultation.appointment?.reason ||
            consultation.appointment?.symptoms
          }
        />

        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#111827",
            marginTop: 8,
            marginBottom: 10,
          }}
        >
          SOAP Notes
        </Text>

        <Section
          title="S — Subjective"
          icon="person-outline"
          value={consultation.subjective || consultation.chief_complaint}
        />

        <Section
          title="O — Objective"
          icon="eye-outline"
          value={consultation.objective}
        />

        <Section
          title="A — Assessment"
          icon="clipboard-outline"
          value={consultation.assessment || consultation.diagnosis}
        />

        <Section
          title="P — Plan"
          icon="reader-outline"
          value={consultation.plan || treatment}
        />

        <Section
          title="Diagnosis"
          icon="pulse-outline"
          value={consultation.diagnosis}
        />

        <Section
          title="Treatment / Prescription"
          icon="medkit-outline"
          value={treatment}
        />

        <Section
          title="Notes"
          icon="document-text-outline"
          value={consultation.notes}
        />

        {isCompleted ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/feedback/new",
                params: {
                  consultation_id: String(consultation.id),
                  appointment_id: String(consultation.appointment_id ?? ""),
                  service_type: "health_followup",
                },
              })
            }
            activeOpacity={0.85}
            style={{
              marginTop: 8,
              backgroundColor: "#0D9488",
              borderRadius: 18,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="pulse-outline"
              size={22}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18 }}>
              Health Follow-up
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}