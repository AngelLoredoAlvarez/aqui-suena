import { composeMeta } from "@aqui-suena/ui/ads-carousel/utils/compose-meta";
import { describe, expect, it } from "vitest";

const source = {
  category: "Comida",
  opensLabel: "Abre 8:00",
};

describe("composeMeta", () => {
  it("composes category and opening time on mobile", () => {
    expect(composeMeta(source, { isWide: false })).toBe("Comida · Abre 8:00");
  });

  it("omits the opening time on wide", () => {
    expect(composeMeta(source, { isWide: true })).toBe("Comida");
  });

  it("omits a missing opensLabel on mobile", () => {
    expect(composeMeta({ category: "Comida" }, { isWide: false })).toBe("Comida");
  });

  it("never includes the delivery label", () => {
    const withDelivery = { ...source, delivery: true };

    expect(composeMeta(withDelivery, { isWide: true })).toBe("Comida");
    expect(composeMeta(withDelivery, { isWide: false })).toBe("Comida · Abre 8:00");
  });
});
