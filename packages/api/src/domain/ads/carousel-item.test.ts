import { type CarouselItemSource, toCarouselItem } from "@aqui-suena/api/domain/ads/carousel-item";
import { describe, expect, it } from "vitest";

const source: CarouselItemSource = {
  business: {
    id: "b-1",
    name: "Casa Rosa",
    category: "food",
    delivery: true,
    timezone: "America/Mexico_City",
  },
  hours: [{ day: 1, openMinute: 480, closeMinute: 1080 }],
};

const now = new Date("2026-11-02T12:00:00-06:00");

describe("toCarouselItem", () => {
  it("maps business fields into an AdsCarouselItem", () => {
    const item = toCarouselItem(source, "https://r2/flyer.png", now);

    expect(item.id).toBe("b-1");
    expect(item.name).toBe("Casa Rosa");
    expect(item.category).toBe("food");
    expect(item.delivery).toBe(true);
    expect(item.imageUrl).toBe("https://r2/flyer.png");
  });

  it("derives isOpen from hours + timezone + now", () => {
    const item = toCarouselItem(source, "https://r2/flyer.png", now);

    expect(item.isOpen).toBe(true);
  });

  it("marks closed when now is outside business hours", () => {
    const night = new Date("2026-11-06T23:00:00-06:00");
    const item = toCarouselItem(source, "https://r2/flyer.png", night);

    expect(item.isOpen).toBe(false);
  });

  it("sets alt text referencing the business name", () => {
    const item = toCarouselItem(source, "https://r2/flyer.png", now);

    expect(item.alt).toBe("Flyer de Casa Rosa");
  });

  it("leaves href undefined by default", () => {
    const item = toCarouselItem(source, "https://r2/flyer.png", now);

    expect(item.href).toBeUndefined();
  });

  it("leaves opensLabel undefined (computed elsewhere)", () => {
    const item = toCarouselItem(source, "https://r2/flyer.png", now);

    expect(item.opensLabel).toBeUndefined();
  });
});
