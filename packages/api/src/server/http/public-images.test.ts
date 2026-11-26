import type { MediaKind } from "@aqui-suena/api/domain/media/media-kind";
import { InMemoryObjectStorage } from "@aqui-suena/api/infrastructure/memory/in-memory-object-storage";
import { createInMemoryRepositories } from "@aqui-suena/api/server/composition/repositories";
import { createApp } from "@aqui-suena/api/server/http/app";
import { describe, expect, it } from "vitest";

const FILE_ID = "11111111-1111-1111-1111-111111111111";

async function setup(
  input: {
    pathKind?: MediaKind;
    rowKind?: MediaKind;
    hidden?: boolean;
    attach?: boolean;
    otherBusiness?: boolean;
    confirmObject?: boolean;
  } = {},
) {
  const repositories = createInMemoryRepositories();

  const storage = new InMemoryObjectStorage();

  const business = await repositories.business.create({
    accountId: "acc-1",
    name: "Casa Rosa",
    category: "food",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Mexico_City",
    delivery: true,
  });

  const pathKind = input.pathKind ?? "flyer";

  const key = `media/v1/acc-1/businesses/${business.id}/${pathKind}/${FILE_ID}.jpg`;

  const media = await repositories.media.create({
    ownerId: "acc-1",
    businessId: business.id,
    kind: input.rowKind ?? pathKind,
    r2Key: key,
    mime: "image/jpeg",
    size: 4,
  });

  const flyerBusiness = input.otherBusiness
    ? await repositories.business.create({
        accountId: "acc-2",
        name: "Other",
        category: "food",
        phone: null,
        email: null,
        address: null,
        timezone: "America/Mexico_City",
        delivery: false,
      })
    : business;

  if (input.attach !== false) {
    await repositories.flyer.create({ businessId: flyerBusiness.id, mediaId: media.id });
  }

  if (input.hidden) {
    await repositories.business.update(business.id, { hiddenAt: new Date() });
  }

  if (input.confirmObject !== false) {
    storage.confirm(key, 4, "image/jpeg", new Date(), new TextEncoder().encode("jpeg"));
  }

  const app = createApp({
    allowedOrigins: [],
    logRequests: false,
    directoryRepositories: repositories,
    mediaStorage: storage,
  });

  return { app, key, media };
}

function get(app: ReturnType<typeof createApp>, key: string) {
  return app.request(`https://api.test/images/${key}`);
}

function expectNotFound(response: Response) {
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("GET /images/*", () => {
  it("serves a flyer of a visible business with public cache headers", async () => {
    const { app, key, media } = await setup();

    const response = await get(app, key);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("etag")).toBe(`"${media.id}"`);
    expect(await response.text()).toBe("jpeg");
  });

  it("serves the same key when the request carries a query string", async () => {
    const { app, key } = await setup();

    const response = await app.request(`https://api.test/images/${key}?v=1`);

    expect(response.status).toBe(200);
  });

  it("answers 404 for a hidden business", async () => {
    const { app, key } = await setup({ hidden: true });

    expectNotFound(await get(app, key));
  });

  it("answers 404 when the row kind is not flyer under a flyer path", async () => {
    const { app, key } = await setup({ rowKind: "avatar" });

    expectNotFound(await get(app, key));
  });

  it("answers 404 for a non-flyer path", async () => {
    const { app, key } = await setup({ pathKind: "product-photo" });

    expectNotFound(await get(app, key));
  });

  it("answers 404 when the media is not attached to a flyer", async () => {
    const { app, key } = await setup({ attach: false });

    expectNotFound(await get(app, key));
  });

  it("answers 404 when the flyer belongs to another business", async () => {
    const { app, key } = await setup({ otherBusiness: true });

    expectNotFound(await get(app, key));
  });

  it("answers 404 for a valid key with no media row", async () => {
    const { app } = await setup();

    const unknown = `media/v1/acc-1/businesses/other/flyer/${FILE_ID}.jpg`;

    expectNotFound(await get(app, unknown));
  });

  it("answers 404 when the object is missing from storage", async () => {
    const { app, key } = await setup({ confirmObject: false });

    expectNotFound(await get(app, key));
  });

  it("answers 404 and does not cache malformed or out-of-scope keys", async () => {
    const { app, key } = await setup();

    const invalid = [
      "not-a-media-key",
      key.replace(/\.jpg$/, ".exe"),
      key.replace("/flyer/", "//flyer/"),
      `${key}/extra`,
      `${key}/`,
      "cfdi/2026/invoice.pdf",
      `media/v1/acc-1/account/avatar/${FILE_ID}.jpg`,
      `media/v1/acc-1/businesses/%2e%2e/flyer/${FILE_ID}.jpg`,
    ];

    for (const candidate of invalid) {
      expectNotFound(await get(app, candidate));
    }

    expectNotFound(await app.request("https://api.test/images/"));
  });

  it("answers 503 when storage is not configured", async () => {
    const { key } = await setup();

    const unconfigured = createApp({
      allowedOrigins: [],
      logRequests: false,
    });

    const response = await get(unconfigured, key);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
