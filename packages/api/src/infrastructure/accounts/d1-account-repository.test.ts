import { D1AccountRepository } from "@aqui-suena/api/infrastructure/accounts/d1-account-repository";
import { describe, expect, it } from "vitest";

describe("D1AccountRepository", () => {
  it("maps a row with a supported locale", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "acc-1",
            email: "owner@example.com",
            plan_id: "trades",
            locale: "en",
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const account = await new D1AccountRepository(fakeDb).getById("acc-1");

    expect(account).toEqual({
      id: "acc-1",
      email: "owner@example.com",
      planId: "trades",
      locale: "en",
    });
  });

  it("falls back to the default locale when the stored value is invalid", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "acc-1",
            email: "owner@example.com",
            plan_id: "community",
            locale: "fr",
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const account = await new D1AccountRepository(fakeDb).getById("acc-1");

    expect(account?.locale).toBe("es-MX");
  });

  it("returns null when the account does not exist", async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }),
      }),
    } as unknown as D1Database;

    const account = await new D1AccountRepository(fakeDb).getById("missing");

    expect(account).toBeNull();
  });
});
