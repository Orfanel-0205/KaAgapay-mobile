// app/ocr-upload.tsx
// Ka-Agapay Mobile Resident ID Verification Route

import React, { useState } from "react";
import {
View,
Text,
TouchableOpacity,
Image,
Alert,
ScrollView,
ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import apiClient from "../services/api/client";
import { useAuthStore } from "../store/useAuthStore";

const ID_TYPES = [
"School ID",
"National ID",
"Driver's License",
"Passport",
"PhilHealth ID",
"Barangay ID",
"Other government-issued ID",
];

interface OcrUploadResponse {
message: string;
ocr_id: number | null;
status: "approved" | "failed" | "pending" | "processing";
verified: boolean;
confidence_score: number;
extracted_text: string;
extracted_name: string | null;
birthdate: string | null;
id_number: string | null;
auto_fill?: {
full_name?: string | null;
birthdate?: string | null;
id_number?: string | null;
philhealth_number?: string | null;
};
}

export default function OcrUploadScreen() {
const router = useRouter();
const { updateUser } = useAuthStore();

const [preview, setPreview] = useState<string | null>(null);
const [selectedType, setSelectedType] = useState(ID_TYPES[0]);
const [uploading, setUploading] = useState(false);
const [result, setResult] = useState<OcrUploadResponse | null>(null);

const pickImage = async () => {
const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();


if (!permission.granted) {
  Alert.alert(
    "Permission needed",
    "Please allow gallery access to upload your ID."
  );
  return;
}

const picked = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.85,
  allowsEditing: true,
  aspect: [4, 3],
});

if (picked.canceled) return;

setPreview(picked.assets[0].uri);
setResult(null);


};

const uploadAndVerify = async () => {
if (!preview || uploading) return;


setUploading(true);

try {
  const formData = new FormData();

  formData.append("id_type", selectedType);
  formData.append("id_image", {
    uri: preview,
    type: "image/jpeg",
    name: "id.jpg",
  } as any);

  const res = await apiClient.post<OcrUploadResponse>(
    "/ocr/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  setResult(res.data);

  if (res.data.verified) {
    updateUser({
      id_verified: true,
    });
  }

  Alert.alert(
    res.data.verified ? "ID Verified" : "Verification Result",
    res.data.message
  );
} catch (e: any) {
  const msg =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    "Upload failed. Please try again.";

  Alert.alert("Upload Failed", msg);
} finally {
  setUploading(false);
}


};

const canUpload = !!preview && !uploading;

const statusText = result
? result.verified
? "ID Verified"
: "Verification Failed — please upload a clearer image"
: null;

const uploadButtonClass =
"rounded-xl py-4 items-center mb-6 " +
(canUpload ? "bg-teal-600" : "bg-teal-200");

const statusBoxClass =
"p-4 rounded-2xl mb-4 " +
(result?.verified ? "bg-green-50" : "bg-red-50");

const statusTextClass =
"font-bold text-sm " +
(result?.verified ? "text-green-600" : "text-red-500");

return (
<ScrollView
className="flex-1 bg-white"
contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
keyboardShouldPersistTaps="handled"
>
<TouchableOpacity
onPress={() => router.back()}
className="mb-4 flex-row items-center"
> <Ionicons name="chevron-back" size={28} color="#0D9488" /> </TouchableOpacity>


  <Text className="text-2xl font-bold text-gray-800 mb-1">
    ID Verification
  </Text>

  <Text className="text-gray-400 text-sm mb-6">
    Upload a clear photo of any valid government or school ID. Make sure the
    name, photo, and ID number are visible.
  </Text>

  <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
    ID Type
  </Text>

  <View className="flex-row flex-wrap mb-5">
    {ID_TYPES.map((type) => {
      const active = selectedType === type;

      const chipClass =
        "px-3 py-2 mr-2 mb-2 rounded-full border " +
        (active
          ? "bg-teal-600 border-teal-600"
          : "bg-gray-50 border-gray-200");

      const chipTextClass =
        "text-sm " + (active ? "text-white" : "text-gray-600");

      return (
        <TouchableOpacity
          key={type}
          onPress={() => setSelectedType(type)}
          className={chipClass}
        >
          <Text className={chipTextClass}>{type}</Text>
        </TouchableOpacity>
      );
    })}
  </View>

  <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
    ID Photo
  </Text>

  <TouchableOpacity
    onPress={pickImage}
    className="mb-4 items-center"
    disabled={uploading}
  >
    {preview ? (
      <Image
        source={{ uri: preview }}
        style={{
          width: "100%",
          height: 220,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: "#14b8a6",
        }}
        resizeMode="cover"
      />
    ) : (
      <View
        style={{ width: "100%", height: 180 }}
        className="bg-gray-50 rounded-2xl items-center justify-center border-2 border-dashed border-gray-300"
      >
        <Ionicons
          name="card-outline"
          size={40}
          color="#9CA3AF"
          style={{ marginBottom: 8 }}
        />

        <Text className="text-gray-400 text-sm">
          Tap to select your ID image
        </Text>

        <Text className="text-gray-300 text-xs mt-1">
          JPG, PNG, or WebP
        </Text>
      </View>
    )}
  </TouchableOpacity>

  {preview && !uploading && (
    <TouchableOpacity onPress={pickImage} className="mb-4 items-center">
      <Text className="text-teal-600 text-sm">Change image</Text>
    </TouchableOpacity>
  )}

  <TouchableOpacity
    onPress={uploadAndVerify}
    disabled={!canUpload}
    className={uploadButtonClass}
  >
    {uploading ? (
      <View className="flex-row items-center">
        <ActivityIndicator color="#fff" />

        <Text className="text-white font-semibold ml-2">
          Processing OCR…
        </Text>
      </View>
    ) : (
      <Text className="text-white font-bold text-base">
        Upload & Verify
      </Text>
    )}
  </TouchableOpacity>

  {statusText && (
    <View className={statusBoxClass}>
      <View className="flex-row items-center">
        <Ionicons
          name={result?.verified ? "checkmark-circle" : "close-circle"}
          size={24}
          color={result?.verified ? "#16A34A" : "#EF4444"}
          style={{ marginRight: 6 }}
        />

        <Text className={statusTextClass}>{statusText}</Text>
      </View>

      {result && (
        <Text className="text-xs text-gray-400 mt-1">
          Confidence: {result.confidence_score}%
        </Text>
      )}
    </View>
  )}

  {result?.extracted_text ? (
    <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">
        Extracted Details
      </Text>

      {result.extracted_name ? (
        <Text className="text-sm text-gray-700 mb-1">
          <Text className="font-semibold">Name: </Text>
          {result.extracted_name}
        </Text>
      ) : null}

      {result.birthdate ? (
        <Text className="text-sm text-gray-700 mb-1">
          <Text className="font-semibold">Birthdate: </Text>
          {result.birthdate}
        </Text>
      ) : null}

      {result.id_number ? (
        <Text className="text-sm text-gray-700 mb-2">
          <Text className="font-semibold">ID Number: </Text>
          {result.id_number}
        </Text>
      ) : null}

      <Text className="text-xs font-semibold text-gray-400 uppercase mb-1 mt-1">
        Raw OCR Text
      </Text>

      <Text className="text-xs text-gray-500 leading-5">
        {result.extracted_text}
      </Text>
    </View>
  ) : null}

  <View className="bg-blue-50 rounded-2xl p-4">
    <Text className="text-xs font-semibold text-blue-600 uppercase mb-2">
      Tips for better OCR results
    </Text>

    {[
      "Lay ID flat on a dark surface",
      "Make sure all text is clearly visible",
      "Avoid glare, blur, and shadows",
      "Capture the full ID including edges",
    ].map((tip) => (
      <Text key={tip} className="text-xs text-blue-500 mb-1">
        • {tip}
      </Text>
    ))}
  </View>
</ScrollView>


);
}
