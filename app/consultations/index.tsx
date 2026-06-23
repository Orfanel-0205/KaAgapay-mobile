// app/consultations/index.tsx
// Ka-Agapay Mobile Resident Consultations List Screen

import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenHeader from "../../Components/ScreenHeader";
import { tr, useLang } from "../../constants/i18n";
import {
  fetchMyConsultations,
  getConsultationDate,
  getConsultationDoctorName,
  type Consultation,
} from "../../services/api/consultations";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
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
    };
  }

  if (value === "cancelled") {
    return {
      bg: "#FEE2E2",
      text: "#B91C1C",
    };
  }

  if (value === "ongoing") {
    return {
      bg: "#DBEAFE",
      text: "#1D4ED8",
    };
  }

  return {
    bg: "#FEF3C7",
    text: "#92400E",
  };
}

function getPreviewText(item: Consultation): string {
  return (
    item.diagnosis ||
    item.assessment ||
    item.chief_complaint ||
    item.subjective ||
    item.appointment?.reason ||
    item.appointment?.symptoms ||
    "SOAP note available"
  );
}

export default function ConsultationsIndexScreen() {
  const router = useRouter();
  const lang = useLang();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyConsultations();
      setConsultations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load consultations."
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

  const sortedConsultations = useMemo(() => {
    return [...consultations].sort((a, b) => {
      const ad = new Date(getConsultationDate(a) || 0).getTime();
      const bd = new Date(getConsultationDate(b) || 0).getTime();

      return bd - ad;
    });
  }, [consultations]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScreenHeader
        title={tr("consults_title", lang)}
        subtitle={tr("consults_subtitle", lang)}
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
        {loading ? (
          <View
            style={{
              paddingVertical: 60,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#0D9488" />

            <Text style={{ color: "#6B7280", marginTop: 10 }}>
              Loading consultations...
            </Text>
          </View>
        ) : sortedConsultations.length === 0 ? (
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
            <Text
              style={{
                fontSize: 23,
                fontWeight: "700",
                color: "#374151",
                textAlign: "center",
              }}
            >
              {tr("empty_consultations_title", lang)}
            </Text>

            <Text
              style={{
                color: "#6B7280",
                marginTop: 6,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {tr("empty_consults_body", lang)}
            </Text>
          </View>
        ) : (
          sortedConsultations.map((item) => {
            const status = item.status || "open";
            const colors = getStatusColors(status);
            const route = "/consultations/" + String(item.id);

            return (
              <TouchableOpacity
                key={String(item.id)}
                onPress={() => router.push(route as any)}
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
                    <Text
                      style={{
                        fontSize: 23,
                        fontWeight: "800",
                        color: "#111827",
                      }}
                    >
                      {getConsultationDoctorName(item)}
                    </Text>

                    <Text
                      style={{
                        color: "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      {formatDate(getConsultationDate(item))}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={{
                        color: "#374151",
                        marginTop: 8,
                        lineHeight: 20,
                      }}
                    >
                      {getPreviewText(item)}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: "900",
                        textTransform: "uppercase",
                      }}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}