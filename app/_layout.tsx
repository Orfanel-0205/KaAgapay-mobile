// app/_layout.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";
import "../global.css";
import { usePushNotifications } from "../hooks/usePushNotifications";
import DuckOverlay from "../Components/DuckOverlay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  usePushNotifications();

  return (
    <View style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Slot />
        {/* Doctor Quack for refusals, server errors and maintenance. */}
        <DuckOverlay />
      </QueryClientProvider>
    </View>
  );
}