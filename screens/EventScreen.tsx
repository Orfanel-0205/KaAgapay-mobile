// screens/EventScreen.tsx
// Ka-Agapay Mobile Resident Events Screen
// Shows published event, program, and announcement posts only.

import React, { useMemo, useState } from "react";
import {
ActivityIndicator,
Image,
RefreshControl,
ScrollView,
Text,
TextInput,
TouchableOpacity,
View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
fetchPublishedEvents,
type MobileEventPost,
type MobileEventType,
} from "../services/api/events";

type FilterType = "all" | MobileEventType;

function formatDate(value?: string | null) {
if (!value) return "Date to be announced";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "Date to be announced";
}

return date.toLocaleString("en-PH", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
});
}

function getTypeLabel(type: MobileEventType) {
if (type === "event") return "Event";
if (type === "program") return "Program";

return "Announcement";
}

function getFilterLabel(type: FilterType) {
if (type === "all") return "ALL";
if (type === "event") return "EVENT";
if (type === "program") return "PROGRAM";

return "ANNOUNCEMENT";
}

function PostCard({ post }: { post: MobileEventPost }) {
const imageUrl = post.image_url || post.banner_url || undefined;

return ( <View className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100">
{!!imageUrl && (
<Image
source={{
uri: imageUrl,
}}
className="w-full h-44"
resizeMode="cover"
/>
)}

  <View className="p-4">
    <View className="flex-row justify-between items-center mb-2">
      <Text className="text-xs font-bold text-teal-700 uppercase">
        {getTypeLabel(post.event_type)}
      </Text>

      {post.priority === "urgent" && (
        <Text className="text-xs font-bold text-red-600">URGENT</Text>
      )}
    </View>

    <Text className="text-lg font-bold text-gray-900">{post.title}</Text>

    {!!post.category && (
      <Text className="text-teal-700 text-xs font-semibold mt-1">
        {post.category}
      </Text>
    )}

    {!!post.location && (
      <View className="flex-row items-center mt-2">
        <Ionicons
          name="location-outline"
          size={20}
          color="#6B7280"
          style={{ marginRight: 4 }}
        />

        <Text className="text-gray-500 text-xs">{post.location}</Text>
      </View>
    )}

    <View className="flex-row items-center mt-1">
      <Ionicons
        name="calendar-outline"
        size={20}
        color="#6B7280"
        style={{ marginRight: 4 }}
      />

      <Text className="text-gray-500 text-xs">
        {formatDate(post.event_date || post.starts_at)}
      </Text>
    </View>

    {!!post.target_audience && (
      <View className="flex-row items-center mt-1">
        <Ionicons
          name="people-outline"
          size={20}
          color="#6B7280"
          style={{ marginRight: 4 }}
        />

        <Text className="text-gray-500 text-xs">
          {post.target_audience}
        </Text>
      </View>
    )}

    <Text className="text-gray-700 text-sm mt-3 leading-5">
      {post.description}
    </Text>

    {!!post.tags?.length && (
      <View className="flex-row flex-wrap gap-2 mt-3">
        {post.tags.slice(0, 4).map((tag) => (
          <Text
            key={tag}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
          >
            {"#" + tag}
          </Text>
        ))}
      </View>
    )}
  </View>
</View>

);
}

export default function EventScreen() {
const [search, setSearch] = useState("");
const [type, setType] = useState<FilterType>("all");

const {
data = [],
isLoading,
isRefetching,
refetch,
error,
} = useQuery<MobileEventPost[]>({
queryKey: ["published-events", type],
queryFn: () =>
fetchPublishedEvents({
type,
per_page: 30,
}),
staleTime: 30000,
retry: false,
});

const filtered = useMemo(() => {
const query = search.trim().toLowerCase();

if (!query) return data;

return data.filter((post) => {
  const titleMatch = post.title.toLowerCase().includes(query);
  const descriptionMatch = post.description.toLowerCase().includes(query);
  const locationMatch =
    post.location?.toLowerCase().includes(query) || false;
  const categoryMatch =
    post.category?.toLowerCase().includes(query) || false;

  return titleMatch || descriptionMatch || locationMatch || categoryMatch;
});

}, [data, search]);

const handleRefresh = () => {
refetch();
};

if (isLoading) {
return ( <View className="flex-1 bg-gray-50 items-center justify-center"> <ActivityIndicator size="large" color="#0f766e" /> <Text className="text-gray-500 mt-3">Loading RHU posts...</Text> </View>
);
}

return ( <View className="flex-1 bg-gray-50">
<ScrollView
className="flex-1 p-4"
refreshControl={ <RefreshControl
         refreshing={isRefetching}
         onRefresh={handleRefresh}
       />
}
> <Text className="text-2xl font-bold text-gray-900">RHU Posts</Text>

    <Text className="text-gray-500 mt-1 mb-4">
      Published events, programs, and announcements from RHU staff.
    </Text>

    <TextInput
      className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3"
      placeholder="Search posts..."
      placeholderTextColor="#9CA3AF"
      value={search}
      onChangeText={setSearch}
    />

    <View className="flex-row mb-4">
      {(["all", "event", "program", "announcement"] as FilterType[]).map(
        (item) => {
          const active = type === item;

          return (
            <TouchableOpacity
              key={item}
              onPress={() => setType(item)}
              className={
                "px-3 py-2 rounded-full mr-2 " +
                (active
                  ? "bg-teal-700"
                  : "bg-white border border-gray-200")
              }
            >
              <Text
                className={
                  "text-xs font-semibold " +
                  (active ? "text-white" : "text-gray-700")
                }
              >
                {getFilterLabel(item)}
              </Text>
            </TouchableOpacity>
          );
        }
      )}
    </View>

    {!!error && (
      <View className="bg-red-50 border border-red-100 p-4 rounded-xl mb-4">
        <Text className="text-red-700">
          Unable to load RHU posts. Check your Laravel server or API URL.
        </Text>
      </View>
    )}

    {filtered.length === 0 ? (
      <View className="bg-white p-8 rounded-2xl items-center">
        <Ionicons name="calendar-outline" size={36} color="#9CA3AF" />

        <Text className="text-lg font-bold text-gray-800 mt-3">
          No published posts yet
        </Text>

        <Text className="text-gray-500 text-center mt-2">
          Once RHU staff publish an event, program, or announcement, it
          will appear here.
        </Text>
      </View>
    ) : (
      filtered.map((post) => <PostCard key={post.id} post={post} />)
    )}

    <View style={{ height: 30 }} />
  </ScrollView>
</View>

);
}
