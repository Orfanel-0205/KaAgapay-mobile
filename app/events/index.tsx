// app/events/index.tsx
// Ka-Agapay Mobile Resident Events List Screen

import React from "react";
import {
View,
Text,
ScrollView,
TouchableOpacity,
ActivityIndicator,
Image,
RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
fetchPublishedEvents,
type MobileEventPost,
} from "../../services/api/events";

function formatEventDate(value?: string | null) {
if (!value) return null;

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return null;
}

return date.toLocaleString("en-PH", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

function getShortDescription(value?: string | null) {
const description = value || "";

if (description.length > 120) {
return description.slice(0, 120) + "...";
}

return description;
}

export default function EventsScreen() {
const router = useRouter();

const {
data: events = [],
isLoading,
isError,
refetch,
isRefetching,
} = useQuery<MobileEventPost[]>({
queryKey: ["published-events"],
queryFn: () =>
fetchPublishedEvents({
type: "all",
per_page: 20,
}),
retry: false,
});

return ( <View className="flex-1 bg-gray-50"> <View className="bg-teal-600 px-5 pt-14 pb-5 rounded-b-3xl"> <View className="flex-row items-center justify-between">
<TouchableOpacity
onPress={() => router.back()}
className="flex-row items-center"
hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
> <Ionicons name="chevron-back" size={26} color="#FFFFFF" /> </TouchableOpacity>


      <Text className="text-white text-2xl font-bold">Events</Text>

      <View style={{ width: 48 }} />
    </View>

    <Text className="text-teal-100 mt-2 text-base text-center">
      Health events, programs, and announcements
    </Text>
  </View>

  {isLoading ? (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0D9488" />

      <Text className="text-gray-500 mt-3">Loading events...</Text>
    </View>
  ) : isError ? (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-red-600 font-bold text-lg">
        Failed to load events
      </Text>

      <Text className="text-gray-500 text-center mt-2">
        Please check your Laravel server or network connection.
      </Text>

      <TouchableOpacity
        onPress={() => refetch()}
        className="bg-teal-600 px-5 py-3 rounded-xl mt-4"
      >
        <Text className="text-white font-bold">Retry</Text>
      </TouchableOpacity>
    </View>
  ) : events.length === 0 ? (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="calendar-outline" size={44} color="#9CA3AF" />

      <Text className="text-gray-800 font-bold text-lg mt-3">
        No events available
      </Text>

      <Text className="text-gray-500 text-center mt-2">
        Published CMS posts will appear here.
      </Text>
    </View>
  ) : (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
        />
      }
    >
      {events.map((event) => {
        const imageUri = event.banner_url || event.image_url || "";
        const eventDate = formatEventDate(event.event_date);
        const eventRoute = "/events/" + String(event.id);
        const description = getShortDescription(event.description);

        return (
          <TouchableOpacity
            key={event.id}
            activeOpacity={0.85}
            onPress={() => router.push(eventRoute as any)}
            className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100"
            style={{ elevation: 2 }}
          >
            {!!imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: "100%",
                  height: 150,
                  backgroundColor: "#F3F4F6",
                }}
                resizeMode="cover"
              />
            )}

            <View className="p-4">
              <View className="flex-row items-center mb-2">
                <View className="bg-teal-50 px-2 py-1 rounded-full">
                  <Text className="text-teal-700 text-xs font-bold uppercase">
                    {event.event_type}
                  </Text>
                </View>

                {event.priority && event.priority !== "normal" ? (
                  <View className="bg-red-50 px-2 py-1 rounded-full ml-2">
                    <Text className="text-red-600 text-xs font-bold uppercase">
                      {event.priority}
                    </Text>
                  </View>
                ) : null}

                {event.is_registered ? (
                  <View className="bg-green-50 px-2 py-1 rounded-full ml-2">
                    <Text className="text-green-700 text-xs font-bold uppercase">
                      Registered
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text className="text-gray-900 text-lg font-bold">
                {event.title}
              </Text>

              <Text className="text-gray-500 text-sm mt-2 leading-5">
                {description}
              </Text>

              {!!eventDate && (
                <View className="flex-row items-center mt-3">
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#4B5563"
                    style={{ marginRight: 5 }}
                  />

                  <Text className="text-gray-600 text-sm">
                    {eventDate}
                  </Text>
                </View>
              )}

              {!!event.location && (
                <View className="flex-row items-center mt-1">
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#4B5563"
                    style={{ marginRight: 5 }}
                  />

                  <Text className="text-gray-600 text-sm">
                    {event.location}
                  </Text>
                </View>
              )}

              {event.is_registered && event.registration?.queue_number ? (
                <View className="bg-green-50 rounded-xl px-3 py-2 mt-3 border border-green-100">
                  <Text className="text-green-700 text-xs font-bold">
                    Your Event Queue No.
                  </Text>

                  <Text className="text-green-900 text-lg font-extrabold">
                    {event.registration.queue_number}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  )}
</View>


);
}
