// hooks/useBarangays.ts

import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/api/client";
import { BARANGAYS } from "../constants/barangay";

interface BarangaysResponse {
  data: string[];
  total: number;
}

export function useBarangays() {
  const query = useQuery<string[]>({
    queryKey: ["barangays"],
    queryFn: async () => {
      const res = await apiClient.get<BarangaysResponse>("/barangays");

      const names = res.data.data ?? [];

      if (!names.length) {
        throw new Error("Barangay API returned an empty list.");
      }

      return names.map((n: string) => n.trim());
    },
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2,
    placeholderData: [...BARANGAYS],
  });

  return {
    barangays:
      query.data && query.data.length > 0
        ? query.data
        : [...BARANGAYS],

    isLoading: query.isLoading || query.isFetching,

    // Important:
    // true ONLY if /barangays successfully responded.
    isReady: query.isSuccess && !query.isPlaceholderData,

    isError: query.isError,
    error: query.error,
  };
}