import { InMemoryProductRepository } from "@aqui-suena/api/domain/directory/product";
import { describe, expect, it } from "vitest";
import { createProductsRouter } from "./products";

const sample = {
  id: "pdct-1",
  businessId: "biz-1",
  name: "SSD Samsung 990 Pro 1TB",
  description: "Disco solido",
  price: 10000,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

describe("products router", () => {
  it("lists products from the repository", async () => {
    const repository = new InMemoryProductRepository([{ ...sample }]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const products = await caller.list();

    expect(products).toHaveLength(1);
    expect(products[0]?.id).toBe("pdct-1");
  });

  it("returns null when getById finds nothing", async () => {
    const repository = new InMemoryProductRepository([]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.getById("nonexistent")).toBeNull();
  });

  it("creates a product with generated id", async () => {
    const repository = new InMemoryProductRepository([]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
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
    const repository = new InMemoryProductRepository([{ ...sample }]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });
    const updated = await caller.update({ id: "pdct-1", price: 9000 });

    expect(updated?.price).toBe(9000);
    expect(updated?.name).toBe("SSD Samsung 990 Pro 1TB");
  });

  it("returns null when updating a non-existent product", async () => {
    const repository = new InMemoryProductRepository([]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.update({ id: "nonexistent", name: "X" })).toBeNull();
  });

  it("deletes a product and reports success", async () => {
    const repository = new InMemoryProductRepository([{ ...sample }]);
    const router = createProductsRouter(repository);
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    expect(await caller.delete("pdct-1")).toBe(true);
  });
});
