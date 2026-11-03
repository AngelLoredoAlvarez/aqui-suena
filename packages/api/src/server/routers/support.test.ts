import { ENTITLEMENTS } from "@aqui-suena/api/domain/entitlements";
import { InMemoryPlanRepository } from "@aqui-suena/api/domain/plans";
import { createSupportRouter } from "@aqui-suena/api/server/routers/support";
import { describe, expect, it, vi } from "vitest";

const plans = [
  {
    id: "community" as const,
    name: "Comunidad",
    audience: "Presencia básica.",
    description: "Anuncia tu negocio sin costo.",
    benefits: ["Contacto directo"],
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "MXN",
    active: true,
    entitlements: ENTITLEMENTS.community,
  },
];

describe("support.chat", () => {
  it("returns fallback when no AI binding", async () => {
    const router = createSupportRouter(new InMemoryPlanRepository(plans), undefined);
    const caller = router.createCaller({});
    const result = await caller.chat({ message: "hola", locale: "es" });
    expect(result.fallback).toBe(true);
  });

  it("calls AI with catalog context", async () => {
    const fakeAi = {
      run: async (_model: string, inputs: { messages: { role: string; content: string }[] }) => {
        expect(inputs.messages.map((m) => m.content).join("\n")).toContain("Comunidad");
        return { response: "El plan Comunidad es gratis." };
      },
    };
    const router = createSupportRouter(new InMemoryPlanRepository(plans), fakeAi);
    const caller = router.createCaller({});
    const result = await caller.chat({ message: "¿qué planes hay?", locale: "es" });
    expect(result.fallback).toBe(false);
    expect(result.reply).toBe("El plan Comunidad es gratis.");
  });

  it("falls back on AI error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeAi = {
      run: async () => {
        throw new Error("rate limited");
      },
    };
    const router = createSupportRouter(new InMemoryPlanRepository(plans), fakeAi);
    const caller = router.createCaller({});
    const result = await caller.chat({ message: "hola", locale: "es" });
    expect(result.fallback).toBe(true);
    consoleSpy.mockRestore();
  });

  it("normalizes unsupported locale to en", async () => {
    const fakeAi = {
      run: async (_model: string, inputs: { messages: { role: string; content: string }[] }) => {
        expect(inputs.messages.map((m) => m.content).join("\n")).toContain("Reply in English");
        return { response: "The Community plan is free." };
      },
    };
    const router = createSupportRouter(new InMemoryPlanRepository(plans), fakeAi);
    const caller = router.createCaller({});
    const result = await caller.chat({ message: "hola", locale: "fr" });
    expect(result.fallback).toBe(false);
  });

  it("rejects message longer than 500 chars", async () => {
    const router = createSupportRouter(new InMemoryPlanRepository(plans), undefined);
    const caller = router.createCaller({});
    await expect(caller.chat({ message: "a".repeat(501), locale: "en" })).rejects.toThrow(
      "message is too long",
    );
  });

  it("responds in English when locale is en", async () => {
    const fakeAi = {
      run: async (_model: string, inputs: { messages: { role: string; content: string }[] }) => {
        expect(inputs.messages.map((m) => m.content).join("\n")).toContain("Aquí Suena");
        return { response: "The Community plan is free." };
      },
    };
    const router = createSupportRouter(new InMemoryPlanRepository(plans), fakeAi);
    const caller = router.createCaller({});
    const result = await caller.chat({ message: "What plans are available?", locale: "en" });
    expect(result.fallback).toBe(false);
    expect(result.reply).toBe("The Community plan is free.");
  });
});
