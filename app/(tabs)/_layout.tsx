// app/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import { Image } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0d9488",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          borderTopColor: "#F3F4F6",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: () => (
            <Image
              source={require("../../assets/Homeicon.png")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chatbot"
        options={{
          title: "Chat",
          tabBarIcon: () => (
            <Image
              source={require("../../assets/chatboticon.png")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="telemedicine"
        options={{
          title: "Tele",
          tabBarIcon: () => (
            <Image
              source={require("../../assets/Tele.png")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => (
            <Image
              source={require("../../assets/Profile.png")}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}