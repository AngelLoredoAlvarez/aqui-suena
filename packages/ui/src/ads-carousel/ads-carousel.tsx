import { H2, Paragraph, YStack } from "tamagui";

// TEMPORARY placeholder for the future ads-display module (see SPEC-ads-display).
// Renders a static carousel slot until real ad inventory lands. Do not build
// ad logic here; replace this component when the ads-display module ships.
export function AdsCarousel() {
  return (
    <YStack items="center" justify="center" gap="2" p="4" aria-label="Advertisements">
      <H2>Ads</H2>
      <Paragraph>Ad carousel placeholder. Real ads land with the ads-display module.</Paragraph>
    </YStack>
  );
}
