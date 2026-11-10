import type { Business } from "@aqui-suena/api/domain/directory/business";
import { InMemoryBusinessRepository } from "@aqui-suena/api/domain/directory/business";
import { InMemoryProductRepository } from "@aqui-suena/api/domain/directory/product";
import { createProductsRouter } from "@aqui-suena/api/server/routers/directory/products";
import { describe, expect, it } from "vitest";

const sample = {
  id: "pdct-1",
  businessId: "biz-1",
  name: "SSD Samsung 990 Pro 1TB",
  description: "Disco solido",
  price: 10000,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const business: Business = {
  id: "biz-1",
  accountId: "acc-1",
  name: "Tacos El Güero",
  category: "food",
  phone: null,
  email: null,
  address: null,
  timezone: "America/Mexico_City",
  delivery: false,
  hiddenAt: null,
  retainedUntil: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

function setup(products = [sample]) {
  const repository = new InMemoryProductRepository(products);
  const router = createProductsRouter({
    product: repository,
    business: new InMemoryBusinessRepository([business]),
  });
  const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

  return { repository, caller };
}

describe("products router", () => {
  it("lists products from the repository", async () => {
    const { caller } = setup();
    const products = await caller.list();

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe("pdct-1");
  });

  it("returns null when getById finds nothing", async () => {
    const { caller } = setup([]);

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a product with generated id", async () => {
    const { caller } = setup([]);
    const created = await caller.create({
      businessId: "biz-1",
      name: "SSD",
      description: null,
      price: 5000,
    });

    expect(created.id).toBeTruthy();
    expect(created.price).toBe(5000);
  });

  it("updates a product and preserves unprovided fields", async () => {
    const { caller } = setup();
    const updated = await caller.update({ id: "pdct-1", price: 9000 });

    expect(updated?.price).toBe(9000);
    expect(updated?.name).toBe("SSD Samsung 990 Pro 1TB");
  });

  it("rejects updating a non-existent product with NOT_FOUND", async () => {
    const { caller } = setup([]);

    await expect(caller.update({ id: "nonexistent", name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes a product and reports success", async () => {
    const { caller } = setup();

    expect(await caller.delete("pdct-1")).toBe(true);
  });
});
