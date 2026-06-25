    // services/api/prescriptions.ts

    import { Linking, Platform } from "react-native";
    import * as FileSystem from "expo-file-system/legacy";
    import * as Sharing from "expo-sharing";
    import apiClient from "./client";
    import { useAuthStore } from "../../store/useAuthStore"

    export type PrescriptionStatus =
    | "active"
    | "dispensed"
    | "partially_dispensed"
    | "expired"
    | "cancelled"
    | "voided"
    | string;

    export interface MedicationItem {
    name?: string;
    generic_name?: string;
    dosage?: string;
    dosage_form?: string;
    quantity?: number | string;
    frequency?: string;
    duration?: string;
    route?: string;
    instructions?: string;
    is_controlled?: boolean;
    brand_alternatives_allowed?: boolean;
    }

    export interface LabTestsInput {
    laboratory: string[];
    xray: string[];
    ultrasound: string[];
    others: {
        laboratory?: string;
        xray?: string;
        ultrasound?: string;
    };
    }

    export interface Prescription {
    id: number;
    resident_profile_id?: number;
    prescribed_by?: number;
    consultation_id?: number | null;
    telemedicine_session_id?: number | null;
    form_type?: "medicine" | "lab_request" | string | null;
    prescription_number?: string;
    rhu_id?: number;
    prescription_date?: string | null;
    valid_until?: string | null;
    diagnosis?: string | null;
    diagnosis_code?: string | null;
    clinical_impression?: string | null;
    request_reason?: string | null;
    priority?: string | null;
    request_notes?: string | null;
    lab_tests?: LabTestsInput | null;
    medications?: MedicationItem[] | string[];
    additional_instructions?: string | null;
    dispensing_notes?: string | null;
    status?: PrescriptionStatus;
    dispensed_at?: string | null;
    file_path?: string | null;
    pdf_url?: string | null;
    pdf_endpoint?: string | null;
    patient_name?: string | null;
    prescriber_name?: string | null;
    created_at?: string;
    updated_at?: string;
    }

    function extractArray<T>(payload: any): T[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
    }

    function extractSingle<T>(payload: any): T {
    return payload?.data ?? payload?.prescription ?? payload;
    }

    function normalizeMedications(raw: any): MedicationItem[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
        return raw.map((item) =>
        typeof item === "string" ? { name: item } : item
        );
    }

    if (typeof raw === "string") {
        try {
        const decoded = JSON.parse(raw);

        if (Array.isArray(decoded)) {
            return decoded.map((item) =>
            typeof item === "string" ? { name: item } : item
            );
        }
        } catch {
        return [{ name: raw }];
        }
    }

    return [];
    }

    function normalizeLabTests(raw: any): LabTestsInput | null {
    let value = raw;

    if (typeof value === "string") {
        try {
        value = JSON.parse(value);
        } catch {
        value = null;
        }
    }

    if (!value || typeof value !== "object") {
        return null;
    }

    return {
        laboratory: Array.isArray(value.laboratory)
        ? value.laboratory.map(String)
        : [],
        xray: Array.isArray(value.xray) ? value.xray.map(String) : [],
        ultrasound: Array.isArray(value.ultrasound)
        ? value.ultrasound.map(String)
        : [],
        others: {
        laboratory: value.others?.laboratory || "",
        xray: value.others?.xray || "",
        ultrasound: value.others?.ultrasound || "",
        },
    };
    }

    function normalizePrescription(raw: any): Prescription {
    return {
        ...raw,
        id: Number(raw?.id),
        medications: normalizeMedications(raw?.medications),
        form_type: raw?.form_type || "medicine",
        lab_tests: normalizeLabTests(raw?.lab_tests),
    };
    }

    function sanitizeFileName(value: string): string {
    return value
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
    }

    function getPdfFileName(prescription: Prescription): string {
    return sanitizeFileName(
        `${prescription.prescription_number || `prescription-${prescription.id}`}.pdf`
    );
    }

    function absolutePdfUrl(prescription: Prescription): string {
    const rawUrl =
        prescription.pdf_endpoint ||
        prescription.pdf_url ||
        `/prescriptions/${prescription.id}/pdf`;

    const baseURL = String(apiClient.defaults.baseURL || "").replace(/\/+$/, "");

    if (!baseURL) {
        throw new Error("API base URL is missing.");
    }

    if (/^https?:\/\//i.test(rawUrl)) {
        try {
        const fileUrl = new URL(rawUrl);
        const base = new URL(baseURL);

        if (
            fileUrl.hostname === "127.0.0.1" ||
            fileUrl.hostname === "localhost"
        ) {
            fileUrl.protocol = base.protocol;
            fileUrl.host = base.host;
        }

        return fileUrl.toString();
        } catch {
        return rawUrl;
        }
    }

    const base = new URL(baseURL);
    const origin = `${base.protocol}//${base.host}`;

    if (rawUrl.startsWith("/api/v1")) {
        return `${origin}${rawUrl}`;
    }

    if (rawUrl.startsWith("/")) {
        return `${baseURL}${rawUrl}`;
    }

    return `${baseURL}/${rawUrl}`;
    }

    async function downloadPdfOnWeb(prescription: Prescription): Promise<string> {
    const fileName = getPdfFileName(prescription);

    const response = await apiClient.get(`/prescriptions/${prescription.id}/pdf`, {
        responseType: "blob" as any,
        headers: {
        Accept: "application/pdf",
        },
    });

    const blob =
        response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 30000);

    return url;
    }

    async function downloadPdfOnNative(prescription: Prescription): Promise<string> {
    const token = useAuthStore.getState().token;
    const url = absolutePdfUrl(prescription);

    const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    // Fallback instead of throwing the old error.
    if (!directory) {
        await Linking.openURL(url);
        return url;
    }

    const fileUri = `${directory}${getPdfFileName(prescription)}`;

    const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
        Accept: "application/pdf",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (result.status < 200 || result.status >= 300) {
        throw new Error(`Failed to download PDF. Status: ${result.status}`);
    }

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
        await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Save or share prescription PDF",
        });
    } else {
        await Linking.openURL(result.uri);
    }

    return result.uri;
    }

    export async function fetchMyPrescriptions(): Promise<Prescription[]> {
    const res = await apiClient.get("/prescriptions/mine", {
        params: {
        per_page: 50,
        },
    });

    return extractArray<any>(res.data).map(normalizePrescription);
    }

    export async function fetchPrescription(
    id: number | string
    ): Promise<Prescription> {
    const res = await apiClient.get(`/prescriptions/${id}`);
    return normalizePrescription(extractSingle<any>(res.data));
    }

    export async function downloadPrescriptionPdfToDevice(
    prescription: Prescription
    ): Promise<string> {
    if (!prescription.id) {
        throw new Error("Prescription ID is missing.");
    }

    if (Platform.OS === "web") {
        return downloadPdfOnWeb(prescription);
    }

    return downloadPdfOnNative(prescription);
    }

    export function getMedicationTitle(item: MedicationItem): string {
    return item.name || item.generic_name || "Medicine";
    }

    export function getMedicationSubtitle(item: MedicationItem): string {
    return [
        item.dosage,
        item.dosage_form,
        item.frequency,
        item.duration,
        item.route,
    ]
        .filter(Boolean)
        .join(" · ");
    }

    export function summarizeLabTests(labTests?: LabTestsInput | null): string {
    if (!labTests) return "No requested tests listed.";

    const tests = [
        ...labTests.laboratory,
        ...labTests.xray,
        ...labTests.ultrasound,
        labTests.others.laboratory,
        labTests.others.xray,
        labTests.others.ultrasound,
    ]
        .filter(Boolean)
        .map(String);

    return tests.length ? tests.join(", ") : "No requested tests listed.";
    }
