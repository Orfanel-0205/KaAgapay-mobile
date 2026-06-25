// app/queue/index.tsx
// Queue Status screen for resident mobile app

import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchMyQueueTicket } from "../../services/api/queue";

function normalizeTicket(response: any) {
  return response?.data ?? response?.ticket ?? response ?? null;
}

function labelSource(value?: string) {
  if (value === "online_appointment") return "Online Appointment";
  if (value === "walk_in") return "Walk-in";
  return value || "—";
}

function labelStatus(value?: string) {
  const status = String(value ?? "waiting").toLowerCase();

  if (status === "called") return "Being Called";
  if (status === "in_service") return "Now Serving";
  if (status === "serving") return "Now Serving";
  if (status === "waiting") return "Waiting";
  if (status === "done") return "Completed";
  if (status === "completed") return "Completed";
  if (status === "skipped") return "Skipped";
  if (status === "no_show") return "No Show";
  if (status === "cancelled") return "Cancelled";

  return status;
}

// Plain-language "What should I do?" guidance for each queue status.
function statusHelp(value?: string): string {
  const status = String(value ?? "waiting").toLowerCase();

  if (status === "waiting") return "Please wait for your number to be called.";
  if (status === "called" || status === "serving")
    return "Please proceed to the RHU desk now.";
  if (status === "in_service") return "You are currently being served.";
  if (status === "completed" || status === "done") return "Your service is done.";
  if (status === "skipped")
    return "You were skipped for now. Stay nearby — RHU staff may call you again.";
  if (status === "no_show")
    return "You were marked absent. Please ask RHU staff for help.";
  if (status === "cancelled") return "This queue ticket was cancelled.";

  return "Please wait for instructions from RHU staff.";
}

export default function QueueStatusScreen() {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const response = await fetchMyQueueTicket();
      setTicket(normalizeTicket(response));
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTicket();

    const interval = setInterval(() => {
      loadTicket();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadTicket]);

  const status = String(ticket?.status ?? "").toLowerCase();
  const isCalled = status === "called" || status === "serving";
  const isCompleted = status === "completed" || status === "done";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
        contentContainerStyle={{ padding: 20, paddingTop: 58 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTicket();
            }}
            tintColor="#0F766E"
          />
        }
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Ionicons name="chevron-back" size={26} color="#0F172A" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 34,
            fontWeight: "900",
            color: "#0F172A",
            marginBottom: 6,
          }}
        >
          Queue Status
        </Text>

        <Text style={{ fontSize: 16, color: "#64748B", marginBottom: 22 }}>
          This updates automatically every 5 seconds.
        </Text>

        {loading ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 28,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={{ color: "#64748B", marginTop: 12 }}>
              Loading queue ticket...
            </Text>
          </View>
        ) : ticket ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 22,
              borderWidth: 1,
              borderColor: isCalled || isCompleted ? "#14B8A6" : "#E5E7EB",
            }}
          >
            {isCompleted ? (
              <View
                style={{
                  backgroundColor: "#ECFDF5",
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: "#99F6E4",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#065F46",
                  }}
                >
                  Your consultation/service is completed. Thank you.
                </Text>

                <Text style={{ fontSize: 15, color: "#047857", marginTop: 6 }}>
                  You may leave the RHU after staff gives any final instructions.
                </Text>
              </View>
            ) : null}

            {isCalled ? (
              <View
                style={{
                  backgroundColor: "#ECFDF5",
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: "#99F6E4",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "900",
                    color: "#065F46",
                  }}
                >
                  You are now being called
                </Text>

                <Text style={{ fontSize: 15, color: "#047857", marginTop: 6 }}>
                  Please proceed to the waiting area or assigned counter.
                </Text>
              </View>
            ) : null}

            <Text style={{ color: "#64748B", fontSize: 14 }}>
              Queue Number
            </Text>

            <Text
              style={{
                fontSize: 56,
                fontWeight: "900",
                color: "#0F766E",
                marginTop: 2,
                marginBottom: 14,
              }}
            >
              {ticket.ticket_number ?? ticket.queue_number ?? "—"}
            </Text>

            <View
              style={{
                backgroundColor: "#F0FDFA",
                borderRadius: 16,
                padding: 14,
                marginBottom: 18,
                borderWidth: 1,
                borderColor: "#CCFBF1",
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "800", color: "#0F766E", marginBottom: 4 }}
              >
                What should I do?
              </Text>
              <Text style={{ fontSize: 16, color: "#0F172A", lineHeight: 22 }}>
                {statusHelp(ticket.status)}
              </Text>
            </View>

            <Info label="Status" value={labelStatus(ticket.status)} />
            <Info
              label="RHU"
              value={ticket.rhu_name ?? (ticket.rhu_id ? `RHU ${ticket.rhu_id}` : "—")}
            />
            <Info
              label="Service"
              value={ticket.service_type ?? ticket.service ?? "OPD Consultation"}
            />
            <Info label="Source" value={labelSource(ticket.source)} />
            <Info
              label="Counter / Room"
              value={
                ticket.counter_name ??
                ticket.counter ??
                ticket.room ??
                ticket.room_name ??
                "Waiting area"
              }
            />
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: "#0F172A",
              }}
            >
              No queue number yet
            </Text>

            <Text style={{ fontSize: 16, color: "#64748B", marginTop: 8, lineHeight: 23 }}>
              Your queue number will appear here after the RHU approves your
              appointment or creates your ticket. Please check again later.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/appointments" as any)}
              activeOpacity={0.85}
              style={{
                marginTop: 18,
                backgroundColor: "#0D9488",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                Check My Appointments
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 2 }}>
        {label}
      </Text>

      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
        {String(value ?? "—")}
      </Text>
    </View>
  );
}
