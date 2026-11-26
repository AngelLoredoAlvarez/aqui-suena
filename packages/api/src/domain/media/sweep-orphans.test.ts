import { SweepMediaOrphans } from "@aqui-suena/api/domain/media/sweep-orphans";
import { InMemoryMediaRepository } from "@aqui-suena/api/infrastructure/memory/in-memory-media-repository";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/in-memory-object-storage";
import { describe, expect, it } from "vitest";

const NOW = new Date("2026-02-01T00:00:00Z");
const OLD = new Date("2026-01-30T00:00:00Z");
const NEW = new Date("2026-01-31T23:00:00Z");

function setup() {
  const media = new InMemoryMediaRepository([]);
  const storage = new InMemoryObjectStorage();
  const sweep = new SweepMediaOrphans({ media, storage });

  return { media, storage, sweep };
}

describe("SweepMediaOrphans", () => {
  it("deletes an unreferenced object older than the retention window", async () => {
    const { storage, sweep } = setup();
    const key = "media/v1/acc-1/account/avatar/orphan.png";
    storage.confirm(key, 512, "image/png", OLD);

    expect(await sweep.execute(NOW)).toEqual({ deleted: 1 });
    expect(await storage.list("media/")).toEqual([]);
  });

  it("keeps a referenced object regardless of age", async () => {
    const { media, storage, sweep } = setup();
    const key = "media/v1/acc-1/account/avatar/kept.png";
    storage.confirm(key, 512, "image/png", OLD);

    await media.create({
      ownerId: "acc-1",
      businessId: null,
      kind: "avatar",
      r2Key: key,
      mime: "image/png",
      size: 512,
    });

    expect(await sweep.execute(NOW)).toEqual({ deleted: 0 });
    expect(await storage.list("media/")).toHaveLength(1);
  });

  it("keeps a recent unreferenced object while its upload can still be confirmed", async () => {
    const { storage, sweep } = setup();
    storage.confirm("media/v1/acc-1/account/avatar/recent.png", 512, "image/png", NEW);

    expect(await sweep.execute(NOW)).toEqual({ deleted: 0 });
    expect(await storage.list("media/")).toHaveLength(1);
  });

  it("ignores prefixes outside media/", async () => {
    const { storage, sweep } = setup();
    storage.confirm("cfdi/acc-1/fiscal.xml", 512, "application/xml", OLD);

    expect(await sweep.execute(NOW)).toEqual({ deleted: 0 });
    expect(await storage.list("cfdi/")).toHaveLength(1);
  });
});
