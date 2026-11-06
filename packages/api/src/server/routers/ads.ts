import type { BusinessCarouselDeps } from "@aqui-suena/api/domain/ads/business-carousel";
import { getBusinessCarousel } from "@aqui-suena/api/domain/ads/business-carousel";
import { adsCarouselOutput } from "@aqui-suena/api/domain/radio/ads";
import { publicProcedure, router } from "@aqui-suena/api/trpc";

export function createAdsRouter(deps: BusinessCarouselDeps) {
  return router({
    carousel: publicProcedure.output(adsCarouselOutput).query(async () => {
      return getBusinessCarousel(deps, new Date());
    }),
  });
}
