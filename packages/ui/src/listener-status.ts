import { getListenerStatus } from "@aqui-suena/api";
import { useQuery } from "@tanstack/react-query";

// Shared listener-status query: web and native render the same
// pending / error / data states from one fetcher (no HTTP yet).
export function useListenerStatus(stationId: string) {
  return useQuery({
    queryKey: ["listener-status", stationId],
    queryFn: () => getListenerStatus(stationId),
  });
}
