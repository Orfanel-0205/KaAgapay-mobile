// app/index.tsx
import { Redirect } from "expo-router";
import { useAuthStore } from "../store/useAuthStore";
import { View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { ensureHydration } from "../store/useAuthStore";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated        = useAuthStore((s) => s.hydrated);

  // Trigger hydration check on mount
  useEffect(() => {
    ensureHydration();
  }, []);

  if (!hydrated) {
    return (
      <View style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      }}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return isAuthenticated
    ? <Redirect href="/(tabs)/home" />
    : <Redirect href="/(auth)/login" />;
}