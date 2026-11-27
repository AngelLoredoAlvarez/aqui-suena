import { composeMeta } from "@aqui-suena/ui/ads-carousel/utils/compose-meta";
import { describe, expect, it } from "vitest";

const source = {
  category: "Comida",
  delivery: true,
  opensLabel: "Abre 8:00",
};

describe("composeMeta", () => {
  it("omits the delivery label on mobile", () => {
    expect(composeMeta(source, { isWide: false, deliveryLabel: "Servicio a domicilio" })).toBe(
      "Comida · Abre 8:00",
    );
  });

  it("includes the delivery label on wide", () => {
    expect(composeMeta(source, { isWide: true, deliveryLabel: "Servicio a domicilio" })).toBe(
      "Comida · Servicio a domicilio",
    );
  });

  it("omits delivery when false (no negative badge)", () => {
    expect(
      composeMeta(
        { category: "Salud", delivery: false },
        {
          isWide: false,
          deliveryLabel: "Servicio a domicilio",
        },
      ),
    ).toBe("Salud");
  });

  it("omits a missing opensLabel on mobile", () => {
    expect(
      composeMeta(
        { category: "Comida", delivery: false },
        {
          isWide: false,
          deliveryLabel: "Servicio a domicilio",
        },
      ),
    ).toBe("Comida");
  });
});
