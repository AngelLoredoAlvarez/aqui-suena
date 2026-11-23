import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getBusinessCarousel } from "@aqui-suena/api/domain/ads/business-carousel";
import { InMemoryObjectStorage } from "@aqui-suena/api/domain/media/storage";
import {
  applyLocalMigrations,
  openLocalDatabase,
} from "@aqui-suena/api/server/local/local-database";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

function temporaryDatabase(): string {
  const directory = mkdtempSync(join(tmpdir(), "aqui-suena-local-db-"));

  temporaryDirectories.push(directory);

  return join(directory, "dev.sqlite");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("applyLocalMigrations", () => {
  it("refuses a database with tables but no tracking table", () => {
    const database = new DatabaseSync(":memory:");

    database.exec("CREATE TABLE legacy (id TEXT PRIMARY KEY)");

    expect(() => applyLocalMigrations(database)).toThrow(/migration tracking/);
  });
});

describe("openLocalDatabase", () => {
  it("creates the schema, seeds plans, and is idempotent across restarts", async () => {
    const path = temporaryDatabase();
    const first = await openLocalDatabase(path);

    expect(first.appliedMigrations).toContain("0000_baseline.sql");
    await expect(first.repositories.business.listAll()).resolves.toEqual([]);

    const plans = first.database.prepare("SELECT COUNT(*) AS total FROM plans").get() as {
      total: number;
    };

    expect(plans.total).toBe(3);
    first.close();

    const second = await openLocalDatabase(path);

    expect(second.appliedMigrations).toEqual([]);

    const plansAfterRestart = second.database
      .prepare("SELECT COUNT(*) AS total FROM plans")
      .get() as { total: number };

    expect(plansAfterRestart.total).toBe(3);
    second.close();
  });

  it("serves a carousel item from the local D1 repositories", async () => {
    const local = await openLocalDatabase(temporaryDatabase());
    const { repositories } = local;

    await repositories.account.ensure("acc-local", "local@example.com");

    const business = await repositories.business.create({
      accountId: "acc-local",
      name: "Taquería Local",
      category: "food",
      phone: null,
      email: null,
      address: null,
      timezone: "America/Mexico_City",
      delivery: true,
    });
    const media = await repositories.media.create({
      ownerId: "acc-local",
      businessId: business.id,
      kind: "flyer",
      r2Key: "media/v1/acc-local/business/flyer/test.jpg",
      mime: "image/jpeg",
      size: 128,
    });

    await repositories.flyer.create({ businessId: business.id, mediaId: media.id });

    const items = await getBusinessCarousel(
      {
        businessRepository: repositories.business,
        flyerRepository: repositories.flyer,
        hourRepository: repositories.hour,
        subscriptionRepository: repositories.subscription,
        mediaRepository: repositories.media,
        storage: new InMemoryObjectStorage(),
      },
      new Date("2026-11-23T18:00:00.000Z"),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Taquería Local",
      category: "food",
      delivery: true,
      isOpen: false,
    });
    expect(items[0]?.imageUrl).toContain(media.r2Key);
    local.close();
  });
});
