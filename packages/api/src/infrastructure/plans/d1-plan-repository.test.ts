import { ENTITLEMENTS } from "@aqui-suena/api/domain/plans/entitlements";
import { D1PlanRepository } from "@aqui-suena/api/infrastructure/plans/d1-plan-repository";
import { DataIntegrityError } from "@aqui-suena/api/shared/domain-error";
import { FakeD1Database } from "@aqui-suena/api/testing/d1";
import { describe, expect, it } from "vitest";

const sampleRow = {
  id: "community",
  name: "Comunidad",
  audience: "Cualquier persona o negocio que quiera presencia básica y contacto directo.",
  description: "Anuncia tu negocio sin costo y forma parte del directorio de la región.",
  benefits: JSON.stringify(["Contacto directo", "1 flyer básico"]),
  price_monthly: 0,
  price_annual: 0,
  currency: "MXN",
  active: 1,
};

describe("D1PlanRepository", () => {
  it("maps D1 rows into plans", async () => {
    const fake = new FakeD1Database(() => ({ all: [sampleRow] }));
    const repository = new D1PlanRepository(fake.db);

    const plans = await repository.list();

    expect(plans).toHaveLength(1);
    expect(plans[0]?.id).toBe("community");
    expect(plans[0]?.benefits).toEqual(["Contacto directo", "1 flyer básico"]);
    expect(plans[0]?.entitlements).toBe(ENTITLEMENTS.community);
  });

  it("throws DataIntegrityError when a stored plan id is unknown", async () => {
    const fake = new FakeD1Database(() => ({
      all: [{ ...sampleRow, id: "enterprise", name: "Enterprise", benefits: JSON.stringify([]) }],
    }));
    const repository = new D1PlanRepository(fake.db);

    await expect(repository.list()).rejects.toBeInstanceOf(DataIntegrityError);
  });
});
