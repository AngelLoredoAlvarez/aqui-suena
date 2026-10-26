import { describe, expect, it } from "vitest";
import { composeMeta } from "./compose-meta";

const source = {
  category: "Comida",
  delivery: true,
  opensLabel: "Abre 8:00",
};

describe("composeMeta", () => {
  it("composes all segments on mobile", () => {
    expect(composeMeta(source, { isWide: false, deliveryLabel: "Servicio a domicilio" })).toBe(
      "Comida · Servicio a domicilio · Abre 8:00",
    );
  });

  it("omits opensLabel on wide", () => {
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
