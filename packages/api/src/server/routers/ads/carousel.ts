import { adsCarouselOutput } from "@aqui-suena/api/domain/ads/ads-carousel";
import type { BusinessCarouselDeps } from "@aqui-suena/api/domain/ads/business-carousel";
import { getBusinessCarousel } from "@aqui-suena/api/domain/ads/business-carousel";
import { publicProcedure, router } from "@aqui-suena/api/server/trpc/trpc";

export function createCarouselRouter(deps: BusinessCarouselDeps) {
  return router({
    carousel: publicProcedure.output(adsCarouselOutput).query(async () => {
      return getBusinessCarousel(deps, new Date());
    }),
  });
}
