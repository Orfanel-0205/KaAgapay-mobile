// app/events/[id].tsx
// Ka-Agapay Mobile Resident Event Details Screen

import React from "react";
import {
View,
Text,
ScrollView,
TouchableOpacity,
ActivityIndicator,
Image,
Alert,
RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
useMutation,
useQuery,
useQueryClient,
} from "@tanstack/react-query";
import {
fetchPublishedEventById,
registerForEvent,
cancelEventRegistration,
} from "../../services/api/events";

function formatLongDate(value?: string | null) {
if (!value) return null;

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return null;
}

return date.toLocaleString("en-PH", {
month: "long",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

function formatShortDate(value?: string | null) {
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

export default function EventDetailsScreen() {
const router = useRouter();
const queryClient = useQueryClient();

const params = useLocalSearchParams<{
id: string;
}>();

const eventId = Number(params.id);

const {
data: event,
isLoading,
isError,
refetch,
isRefetching,
} = useQuery({
queryKey: ["published-event", eventId],
queryFn: () => fetchPublishedEventById(eventId),
enabled: Number.isFinite(eventId) && eventId > 0,
retry: false,
});

const registerMutation = useMutation({
mutationFn: () => registerForEvent(eventId),
onSuccess: async () => {
await queryClient.invalidateQueries({
queryKey: ["published-event", eventId],
});


  await queryClient.invalidateQueries({
    queryKey: ["published-events"],
  });

  await queryClient.invalidateQueries({
    queryKey: ["my-event-registrations"],
  });

  await queryClient.invalidateQueries({
    queryKey: ["mobile-my-event-registrations"],
  });

  await refetch();

  Alert.alert("Success", "You are now registered for this event.");
},
onError: (error: any) => {
  Alert.alert(
    "Registration failed",
    error?.response?.data?.message || "Please try again."
  );
},


});

const cancelMutation = useMutation({
mutationFn: () => cancelEventRegistration(eventId),
onSuccess: async () => {
await queryClient.invalidateQueries({
queryKey: ["published-event", eventId],
});


  await queryClient.invalidateQueries({
    queryKey: ["published-events"],
  });

  await queryClient.invalidateQueries({
    queryKey: ["my-event-registrations"],
  });

  await queryClient.invalidateQueries({
    queryKey: ["mobile-my-event-registrations"],
  });

  await refetch();

  Alert.alert("Cancelled", "Your registration was cancelled.");
},
onError: (error: any) => {
  Alert.alert(
    "Cancel failed",
    error?.response?.data?.message || "Please try again."
  );
},


});

if (isLoading) {
return ( <View className="flex-1 bg-gray-50"> <View className="bg-teal-600 px-5 pt-14 pb-5 rounded-b-3xl"> <View className="flex-row items-center justify-between">
<TouchableOpacity
onPress={() => router.back()}
className="flex-row items-center"
hitSlop={{
top: 8,
bottom: 8,
left: 8,
right: 8,
}}
> <Ionicons name="chevron-back" size={26} color="#FFFFFF" /> </TouchableOpacity>


        <Text className="text-white text-2xl font-bold">
          Event Details
        </Text>

        <View style={{ width: 48 }} />
      </View>
    </View>

    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0D9488" />

      <Text className="text-gray-500 mt-3">Loading details...</Text>
    </View>
  </View>
);


}

if (isError || !event) {
return ( <View className="flex-1 bg-gray-50"> <View className="bg-teal-600 px-5 pt-14 pb-5 rounded-b-3xl"> <View className="flex-row items-center justify-between">
<TouchableOpacity
onPress={() => router.back()}
className="flex-row items-center"
hitSlop={{
top: 8,
bottom: 8,
left: 8,
right: 8,
}}
> <Ionicons name="chevron-back" size={26} color="#FFFFFF" /> </TouchableOpacity>


        <Text className="text-white text-2xl font-bold">
          Event Details
        </Text>

        <View style={{ width: 48 }} />
      </View>
    </View>

    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="alert-circle-outline" size={46} color="#DC2626" />

      <Text className="text-red-600 font-bold text-lg mt-3">
        Event not found
      </Text>

      <Text className="text-gray-500 text-center mt-2">
        This post may have been removed, unpublished, or unavailable.
      </Text>

      <TouchableOpacity
        onPress={() => refetch()}
        className="bg-teal-600 px-5 py-3 rounded-xl mt-4"
      >
        <Text className="text-white font-bold">Retry</Text>
      </TouchableOpacity>
    </View>
  </View>
);


}

const imageUri = event.banner_url || event.image_url || "";
const eventDate = formatLongDate(event.event_date);
const registeredAt = formatShortDate(event.registration?.registered_at);
const isFull = event.slots_available === 0;

const isMutationPending =
registerMutation.isPending || cancelMutation.isPending || isRefetching;

const registeredCount =
String(event.total_registered ?? 0) +
(event.max_slots ? " / " + String(event.max_slots) : "");

const cancelButtonClass =
"rounded-2xl py-4 items-center " +
(isMutationPending ? "bg-gray-400" : "bg-red-600");

const registerButtonClass =
"rounded-2xl py-4 items-center " +
(isFull ? "bg-gray-400" : "bg-teal-600");

return ( <View className="flex-1 bg-gray-50"> <View className="bg-teal-600 px-5 pt-14 pb-5 rounded-b-3xl"> <View className="flex-row items-center justify-between">
<TouchableOpacity
onPress={() => router.back()}
className="flex-row items-center"
hitSlop={{
top: 8,
bottom: 8,
left: 8,
right: 8,
}}
> <Ionicons name="chevron-back" size={26} color="#FFFFFF" /> </TouchableOpacity>


      <Text className="text-white text-2xl font-bold">Event Details</Text>

      <View style={{ width: 48 }} />
    </View>
  </View>

  <ScrollView
    className="flex-1"
    contentContainerStyle={{ paddingBottom: 32 }}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl
        refreshing={isRefetching}
        onRefresh={() => refetch()}
      />
    }
  >
    {!!imageUri && (
      <Image
        source={{ uri: imageUri }}
        style={{
          width: "100%",
          height: 220,
          backgroundColor: "#F3F4F6",
        }}
        resizeMode="cover"
      />
    )}

    <View className="p-5">
      <View className="flex-row items-center flex-wrap mb-3">
        <View className="bg-teal-50 px-3 py-1 rounded-full">
          <Text className="text-teal-700 text-xs font-bold uppercase">
            {event.event_type}
          </Text>
        </View>

        {!!event.category && (
          <View className="bg-gray-100 px-3 py-1 rounded-full ml-2">
            <Text className="text-gray-600 text-xs font-bold">
              {event.category}
            </Text>
          </View>
        )}

        {event.priority && event.priority !== "normal" ? (
          <View className="bg-red-50 px-3 py-1 rounded-full ml-2">
            <Text className="text-red-600 text-xs font-bold uppercase">
              {event.priority}
            </Text>
          </View>
        ) : null}

        {event.is_registered ? (
          <View className="bg-green-50 px-3 py-1 rounded-full ml-2">
            <Text className="text-green-700 text-xs font-bold uppercase">
              Registered
            </Text>
          </View>
        ) : null}
      </View>

      <Text className="text-gray-900 text-2xl font-bold">
        {event.title}
      </Text>

      {!!eventDate && (
        <View className="flex-row items-center mt-4">
          <Ionicons
            name="calendar-outline"
            size={24}
            color="#4B5563"
            style={{ marginRight: 6 }}
          />

          <Text className="text-gray-600 text-sm">{eventDate}</Text>
        </View>
      )}

      {!!event.location && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="location-outline"
            size={24}
            color="#4B5563"
            style={{ marginRight: 6 }}
          />

          <Text className="text-gray-600 text-sm">{event.location}</Text>
        </View>
      )}

      {!!event.target_audience && (
        <View className="flex-row items-center mt-2">
          <Ionicons
            name="people-outline"
            size={24}
            color="#4B5563"
            style={{ marginRight: 6 }}
          />

          <Text className="text-gray-600 text-sm">
            {event.target_audience}
          </Text>
        </View>
      )}

      <View className="bg-white rounded-2xl p-4 mt-5 border border-gray-100">
        <Text className="text-gray-900 font-bold text-base mb-2">
          Description
        </Text>

        <Text className="text-gray-600 text-sm leading-6">
          {event.description || "No description provided."}
        </Text>
      </View>

      {!!event.sms_summary && (
        <View className="bg-teal-50 rounded-2xl p-4 mt-4 border border-teal-100">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color="#0F766E"
              style={{ marginRight: 6 }}
            />

            <Text className="text-teal-800 font-bold text-base">
              Summary
            </Text>
          </View>

          <Text className="text-teal-700 text-sm leading-6">
            {event.sms_summary}
          </Text>
        </View>
      )}

      {event.event_type !== "announcement" ? (
        <View className="mt-5">
          <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <Text className="text-gray-900 font-bold text-base">
              Registration
            </Text>

            <Text className="text-gray-500 text-sm mt-1">
              {"Registered: " + registeredCount}
            </Text>

            {event.slots_available !== null &&
            event.slots_available !== undefined ? (
              <Text className="text-gray-500 text-sm mt-1">
                {"Slots available: " + String(event.slots_available)}
              </Text>
            ) : null}

            {event.is_registered ? (
              <View className="bg-green-50 rounded-2xl p-4 mt-4 border border-green-100">
                <Text className="text-green-700 text-xs font-bold uppercase mb-1">
                  Your Event Queue Ticket
                </Text>

                <Text className="text-green-900 text-3xl font-extrabold">
                  {event.registration?.queue_number || "Pending"}
                </Text>

                <Text className="text-green-700 text-sm mt-2">
                  {"Status: " +
                    String(event.registration?.status ?? "registered")}
                </Text>

                {!!registeredAt && (
                  <Text className="text-green-700 text-xs mt-1">
                    {"Registered at: " + registeredAt}
                  </Text>
                )}
              </View>
            ) : null}
          </View>

          {event.is_registered ? (
            <TouchableOpacity
              disabled={isMutationPending}
              onPress={() => {
                Alert.alert(
                  "Cancel registration?",
                  "Are you sure you want to cancel your registration?",
                  [
                    {
                      text: "No",
                      style: "cancel",
                    },
                    {
                      text: "Yes, cancel",
                      style: "destructive",
                      onPress: () => cancelMutation.mutate(),
                    },
                  ]
                );
              }}
              className={cancelButtonClass}
            >
              <Text className="text-white font-bold text-base">
                {cancelMutation.isPending
                  ? "Cancelling..."
                  : "Cancel Registration"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              disabled={registerMutation.isPending || isFull}
              onPress={() => registerMutation.mutate()}
              className={registerButtonClass}
            >
              <Text className="text-white font-bold text-base">
                {registerMutation.isPending
                  ? "Registering..."
                  : isFull
                  ? "Event Full"
                  : "Register for Event"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  </ScrollView>
</View>


);
}
