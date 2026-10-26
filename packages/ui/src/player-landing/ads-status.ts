import { getAdsCarousel } from "@aqui-suena/api/client";
import type { AdsCarouselItem } from "@aqui-suena/ui/ads-carousel";
import { useQuery } from "@tanstack/react-query";

export type { AdsCarouselItem };

export function useAdsCarousel() {
  return useQuery({
    queryKey: ["ads-carousel"],
    queryFn: () => getAdsCarousel(),
  });
}
