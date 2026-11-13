import { HARNESS_STATIONS } from "@aqui-suena/api/domain/radio/harness";
import { InMemoryListenSessionRepository } from "@aqui-suena/api/domain/radio/listen-session";
import { InMemoryStationRepository } from "@aqui-suena/api/domain/radio/station";
import { defaultPlanRepository } from "@aqui-suena/api/server/composition/plans";
import { createInMemoryRepositories } from "@aqui-suena/api/server/composition/repositories";
import { createAppRouter } from "@aqui-suena/api/server/trpc/router";
import { describe, expect, it } from "vitest";

function makeStationRepository() {
  return new InMemoryStationRepository([...HARNESS_STATIONS]);
}

const appRouter = createAppRouter(
  defaultPlanRepository,
  createInMemoryRepositories(),
  makeStationRepository(),
  new InMemoryListenSessionRepository(),
  false,
  undefined,
  undefined,
  undefined,
  undefined,
);

describe("appRouter ads.carousel", () => {
  it("exposes ads.carousel and returns an array", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.ads.carousel();

    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an empty carousel for default (empty) repositories", async () => {
    const caller = appRouter.createCaller({ user: null });
    const result = await caller.ads.carousel();

    expect(result).toEqual([]);
  });
});

describe("createAppRouter media storage", () => {
  it("never substitutes a fake when storage is omitted", async () => {
    const router = createAppRouter(
      defaultPlanRepository,
      createInMemoryRepositories(),
      makeStationRepository(),
      new InMemoryListenSessionRepository(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    const caller = router.createCaller({ user: { id: "u1", accountId: "acc-1" } });

    await expect(
      caller.media.presignUpload({ kind: "avatar", contentType: "image/png", sizeBytes: 512 }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
