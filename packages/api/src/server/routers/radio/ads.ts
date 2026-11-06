import { adsCarouselOutput, getAdsCarousel } from "@aqui-suena/api/ads";
import { publicProcedure, router } from "@aqui-suena/api/trpc";

export const adsRouter = router({
  carousel: publicProcedure.output(adsCarouselOutput).query(() => getAdsCarousel()),
});
