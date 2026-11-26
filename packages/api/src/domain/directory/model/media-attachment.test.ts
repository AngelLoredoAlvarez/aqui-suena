import {
  assertAttachableMedia,
  deleteMediaAttachment,
} from "@aqui-suena/api/domain/directory/model/media-attachment";
import type { Media, MediaRepository } from "@aqui-suena/api/domain/media/media";
import type { ObjectStorage } from "@aqui-suena/api/domain/media/storage";
import { NotFoundError, ValidationError } from "@aqui-suena/api/shared/domain-error";
import { describe, expect, it, vi } from "vitest";

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: "media-1",
    ownerId: "owner-1",
    businessId: "business-1",
    kind: "flyer",
    r2Key: "media/v1/flyer/key",
    mime: "application/pdf",
    size: 10,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("assertAttachableMedia", () => {
  const attach = (repository: MediaRepository) =>
    assertAttachableMedia({
      media: repository,
      accountId: "owner-1",
      businessId: "business-1",
      mediaId: "media-1",
      kind: "flyer",
    });

  it("resolves when the row belongs to the caller, business and kind", async () => {
    const repository = { getById: vi.fn(async () => media()) } as unknown as MediaRepository;

    await expect(attach(repository)).resolves.toBeUndefined();
  });

  it("throws NotFoundError when the row is missing", async () => {
    const repository = { getById: vi.fn(async () => null) } as unknown as MediaRepository;

    await expect(attach(repository)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the caller does not own the row", async () => {
    const repository = {
      getById: vi.fn(async () => media({ ownerId: "someone-else" })),
    } as unknown as MediaRepository;

    await expect(attach(repository)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the row belongs to another business", async () => {
    const repository = {
      getById: vi.fn(async () => media({ businessId: "other-business" })),
    } as unknown as MediaRepository;

    await expect(attach(repository)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ValidationError when the kind does not match", async () => {
    const repository = {
      getById: vi.fn(async () => media({ kind: "spot-audio" })),
    } as unknown as MediaRepository;

    await expect(attach(repository)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("deleteMediaAttachment", () => {
  it("does nothing when there is no media id", async () => {
    const repository = {
      getById: vi.fn(),
      delete: vi.fn(),
    } as unknown as MediaRepository;
    const storage = { delete: vi.fn() } as unknown as ObjectStorage;

    await deleteMediaAttachment(repository, storage, null);

    expect(repository.getById).not.toHaveBeenCalled();
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("does nothing when the row no longer exists", async () => {
    const repository = {
      getById: vi.fn(async () => null),
      delete: vi.fn(),
    } as unknown as MediaRepository;
    const storage = { delete: vi.fn() } as unknown as ObjectStorage;

    await deleteMediaAttachment(repository, storage, "media-1");

    expect(storage.delete).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("deletes the object then the row", async () => {
    const row = media();
    const repository = {
      getById: vi.fn(async () => row),
      delete: vi.fn(async () => true),
    } as unknown as MediaRepository;
    const storage = { delete: vi.fn(async () => {}) } as unknown as ObjectStorage;

    await deleteMediaAttachment(repository, storage, "media-1");

    expect(storage.delete).toHaveBeenCalledWith(row.r2Key);
    expect(repository.delete).toHaveBeenCalledWith(row.id);
  });

  it("deletes the row even when storage is undefined", async () => {
    const row = media();
    const repository = {
      getById: vi.fn(async () => row),
      delete: vi.fn(async () => true),
    } as unknown as MediaRepository;

    await deleteMediaAttachment(repository, undefined, "media-1");

    expect(repository.delete).toHaveBeenCalledWith(row.id);
  });
});
