// app/records/index.tsx
// Ka-Agapay Mobile Resident Medical Records Screen

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
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../../Components/ScreenHeader";
import {
fetchMyConsultations,
getConsultationDate,
getConsultationDoctorName,
getConsultationTreatment,
type Consultation,
} from "../../services/api/consultations";
import {
downloadPrescriptionPdfToDevice,
fetchMyPrescriptions,
getMedicationSubtitle,
getMedicationTitle,
type MedicationItem,
type Prescription,
} from "../../services/api/prescriptions";
import { tr, useLang } from "../../constants/i18n";

type TabKey = "prescriptions" | "consultations";

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

function statusColors(status?: string | null) {
const value = String(status || "").toLowerCase();

if (value === "active") {
return {
bg: "#DCFCE7",
text: "#166534",
border: "#BBF7D0",
};
}

if (value === "dispensed") {
return {
bg: "#DBEAFE",
text: "#1D4ED8",
border: "#BFDBFE",
};
}

if (value === "partially_dispensed") {
return {
bg: "#FEF3C7",
text: "#92400E",
border: "#FDE68A",
};
}

if (value === "cancelled" || value === "voided" || value === "expired") {
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

function EmptyState({
title,
body,
}: {
title: string;
body: string;
}) {
return (
<View
style={{
backgroundColor: "#FFFFFF",
borderRadius: 18,
padding: 24,
alignItems: "center",
borderWidth: 1,
borderColor: "#E5E7EB",
}}
>
<Text style={{ fontSize: 23, fontWeight: "800", color: "#374151" }}>
{title} </Text>


  <Text
    style={{
      color: "#6B7280",
      marginTop: 6,
      textAlign: "center",
      lineHeight: 20,
    }}
  >
    {body}
  </Text>
</View>


);
}

function TabButton({
label,
active,
count,
onPress,
}: {
label: string;
active: boolean;
count: number;
onPress: () => void;
}) {
const countLabel = count > 0 ? " (" + String(count) + ")" : "";

return (
<TouchableOpacity
onPress={onPress}
activeOpacity={0.8}
style={{
flex: 1,
backgroundColor: active ? "#0D9488" : "#FFFFFF",
borderWidth: 1,
borderColor: active ? "#0D9488" : "#D1D5DB",
borderRadius: 999,
paddingVertical: 10,
paddingHorizontal: 8,
alignItems: "center",
}}
>
<Text
numberOfLines={1}
adjustsFontSizeToFit
minimumFontScale={0.7}
style={{
color: active ? "#FFFFFF" : "#374151",
fontWeight: "900",
fontSize: 15,
}}
>
{label + countLabel} </Text> </TouchableOpacity>
);
}

function PrescriptionCard({ item }: { item: Prescription }) {
const lang = useLang();
const [downloading, setDownloading] = React.useState(false);

const colors = statusColors(item.status);
const medicines = Array.isArray(item.medications)
? (item.medications as MedicationItem[])
: [];

const prescriptionTitle =
item.prescription_number || "Prescription #" + String(item.id);

const validUntilText = item.valid_until
? " · " + tr("valid_until", lang) + " " + formatDate(item.valid_until)
: "";

const downloadPdf = async () => {
setDownloading(true);


try {
  await downloadPrescriptionPdfToDevice(item);

  Alert.alert(
    "Prescription downloaded",
    "The PDF was downloaded. Use the save/share option to keep a copy on your phone."
  );
} catch (error: any) {
  Alert.alert(
    "Download failed",
    error?.response?.data?.message ||
      error?.message ||
      "Could not download the prescription PDF."
  );
} finally {
  setDownloading(false);
}


};

return (
<View
style={{
backgroundColor: "#FFFFFF",
borderRadius: 18,
padding: 16,
marginBottom: 12,
borderWidth: 1,
borderColor: "#E5E7EB",
}}
>
<View style={{ flexDirection: "row", gap: 12 }}>
<View
style={{
width: 44,
height: 44,
borderRadius: 14,
backgroundColor: "#ECFDF5",
alignItems: "center",
justifyContent: "center",
}}
> <Ionicons name="medkit" size={24} color="#10B981" /> </View>


    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#111827",
              fontSize: 23,
              fontWeight: "900",
            }}
          >
            {prescriptionTitle}
          </Text>

          <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 20 }}>
            {formatDate(item.prescription_date) + validUntilText}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            {item.status || "active"}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text
          style={{
            color: "#374151",
            fontWeight: "800",
            fontSize: 20,
            marginBottom: 6,
          }}
        >
          {tr("label_diagnosis", lang)}
        </Text>

        <Text style={{ color: "#4B5563", lineHeight: 20 }}>
          {item.diagnosis || "—"}
        </Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text
          style={{
            color: "#374151",
            fontWeight: "800",
            fontSize: 20,
            marginBottom: 6,
          }}
        >
          {tr("label_medications", lang)}
        </Text>

        {medicines.length === 0 ? (
          <Text style={{ color: "#6B7280" }}>
            {tr("no_medicines", lang)}
          </Text>
        ) : (
          medicines.map((med, index) => {
            const title = getMedicationTitle(med);
            const subtitle = getMedicationSubtitle(med);
            const medKey =
              String(item.id) + "-medicine-" + String(index);

            return (
              <View
                key={medKey}
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#F3F4F6",
                }}
              >
                <Text
                  style={{
                    color: "#111827",
                    fontWeight: "800",
                    fontSize: 20,
                  }}
                >
                  {String(index + 1) + ". " + title}
                </Text>

                {!!subtitle && (
                  <Text
                    style={{
                      color: "#6B7280",
                      fontSize: 19,
                      marginTop: 3,
                    }}
                  >
                    {subtitle}
                  </Text>
                )}

                {!!med.instructions && (
                  <Text
                    style={{
                      color: "#4B5563",
                      fontSize: 19,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {med.instructions}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {!!item.additional_instructions && (
        <View style={{ marginTop: 6 }}>
          <Text
            style={{
              color: "#374151",
              fontWeight: "800",
              fontSize: 20,
              marginBottom: 4,
            }}
          >
            Instructions
          </Text>

          <Text style={{ color: "#4B5563", lineHeight: 20 }}>
            {item.additional_instructions}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <TouchableOpacity
          onPress={downloadPdf}
          disabled={downloading}
          activeOpacity={0.8}
          style={{
            backgroundColor: downloading ? "#94A3B8" : "#0D9488",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "900",
              fontSize: 19,
            }}
          >
            {downloading ? "Downloading..." : "Download PDF"}
          </Text>
        </TouchableOpacity>

        {!!item.prescriber_name && (
          <View
            style={{
              backgroundColor: "#F3F4F6",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: "#4B5563",
                fontWeight: "800",
                fontSize: 19,
              }}
            >
              {"Dr. " + item.prescriber_name.trim()}
            </Text>
          </View>
        )}
      </View>
    </View>
  </View>
</View>


);
}

function ConsultationCard({ item }: { item: Consultation }) {
const router = useRouter();
const treatment = getConsultationTreatment(item);
const status = item.status || "open";
const colors =
status === "completed"
? {
bg: "#DCFCE7",
text: "#166534",
border: "#BBF7D0",
}
: {
bg: "#FEF3C7",
text: "#92400E",
border: "#FDE68A",
};

const route = "/consultations/" + String(item.id);

return (
<TouchableOpacity
onPress={() => router.push(route as any)}
activeOpacity={0.85}
style={{
backgroundColor: "#FFFFFF",
borderRadius: 18,
padding: 16,
marginBottom: 12,
borderWidth: 1,
borderColor: "#E5E7EB",
}}
>
<View style={{ flexDirection: "row", gap: 12 }}>
<View
style={{
width: 44,
height: 44,
borderRadius: 14,
backgroundColor: "#EFF6FF",
alignItems: "center",
justifyContent: "center",
}}
> <Ionicons name="medical" size={24} color="#3B82F6" /> </View>


    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#111827",
              fontSize: 23,
              fontWeight: "900",
            }}
          >
            {getConsultationDoctorName(item)}
          </Text>

          <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 20 }}>
            {formatDate(getConsultationDate(item))}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            {status}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={{
          color: "#374151",
          marginTop: 10,
          lineHeight: 20,
        }}
      >
        {item.diagnosis ||
          item.assessment ||
          item.chief_complaint ||
          "SOAP note available"}
      </Text>

      {!!treatment && (
        <Text
          numberOfLines={2}
          style={{
            color: "#6B7280",
            marginTop: 6,
            lineHeight: 19,
            fontSize: 20,
          }}
        >
          {"Treatment: " + treatment}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
        }}
      >
        <Text
          style={{
            color: "#0D9488",
            fontSize: 19,
            fontWeight: "900",
          }}
        >
          View consultation
        </Text>

        <Ionicons
          name="arrow-forward"
          size={20}
          color="#0D9488"
          style={{ marginLeft: 4 }}
        />
      </View>
    </View>
  </View>
</TouchableOpacity>


);
}

export default function RecordsScreen() {
const lang = useLang();
const [activeTab, setActiveTab] = useState<TabKey>("prescriptions");
const [consultations, setConsultations] = useState<Consultation[]>([]);
const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const sortedPrescriptions = useMemo(() => {
return [...prescriptions].sort((a, b) => {
const ad = new Date(a.prescription_date || a.created_at || 0).getTime();
const bd = new Date(b.prescription_date || b.created_at || 0).getTime();


  return bd - ad;
});


}, [prescriptions]);

const sortedConsultations = useMemo(() => {
return [...consultations].sort((a, b) => {
const ad = new Date(getConsultationDate(a) || 0).getTime();
const bd = new Date(getConsultationDate(b) || 0).getTime();


  return bd - ad;
});


}, [consultations]);

const load = useCallback(async () => {
try {
const [consultationRows, prescriptionRows] = await Promise.all([
fetchMyConsultations(),
fetchMyPrescriptions(),
]);


  setConsultations(consultationRows);
  setPrescriptions(prescriptionRows);
} catch (error: any) {
  Alert.alert(
    "Records",
    error?.response?.data?.message ||
      error?.message ||
      "Failed to load medical records."
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

return (
<View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
<ScreenHeader
title={tr("records_title", lang)}
subtitle={tr("records_subtitle", lang)}
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
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <TabButton
        label={tr("tab_prescriptions", lang)}
        count={sortedPrescriptions.length}
        active={activeTab === "prescriptions"}
        onPress={() => setActiveTab("prescriptions")}
      />

      <TabButton
        label={tr("tab_consultations", lang)}
        count={sortedConsultations.length}
        active={activeTab === "consultations"}
        onPress={() => setActiveTab("consultations")}
      />
    </View>

    {loading ? (
      <View
        style={{
          paddingVertical: 60,
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#0D9488" />

        <Text style={{ color: "#6B7280", marginTop: 10 }}>
          {tr("loading_records", lang)}
        </Text>
      </View>
    ) : activeTab === "prescriptions" ? (
      sortedPrescriptions.length === 0 ? (
        <EmptyState
          title={tr("empty_prescriptions_title", lang)}
          body={tr("empty_prescriptions_body", lang)}
        />
      ) : (
        sortedPrescriptions.map((item) => (
          <PrescriptionCard key={item.id} item={item} />
        ))
      )
    ) : sortedConsultations.length === 0 ? (
      <EmptyState
        title={tr("empty_consultations_title", lang)}
        body={tr("empty_consultations_body", lang)}
      />
    ) : (
      sortedConsultations.map((item) => (
        <ConsultationCard key={item.id} item={item} />
      ))
    )}
  </ScrollView>
</View>


);
}
