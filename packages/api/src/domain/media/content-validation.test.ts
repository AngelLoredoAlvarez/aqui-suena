import {
  assertMediaContent,
  MAX_AUDIO_SECONDS,
} from "@aqui-suena/api/domain/media/content-validation";
import { MediaValidationError } from "@aqui-suena/api/domain/media/media-kind";
import { describe, expect, it } from "vitest";

function jpeg(withGps: boolean): Uint8Array {
  if (!withGps) {
    return new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9,
    ]);
  }

  const tiff = new Uint8Array([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x25, 0x88, 0x04, 0x00, 0x01, 0x00,
    0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
    0x02, 0x00, 0x00, 0x00, 0x4e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const data = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]);
  const length = data.length + 2;

  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    (length >> 8) & 0xff,
    length & 0xff,
    ...data,
    0xff,
    0xd9,
  ]);
}

function mp3(frames: number): Uint8Array {
  const bytes = new Uint8Array(417 * frames);

  for (let index = 0; index < frames; index += 1) {
    bytes.set([0xff, 0xfb, 0x90, 0x00], index * 417);
  }

  return bytes;
}

describe("assertMediaContent", () => {
  it("accepts valid image signatures", () => {
    expect(() => assertMediaContent("image/jpeg", jpeg(false))).not.toThrow();
    expect(() =>
      assertMediaContent(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).not.toThrow();
    expect(() =>
      assertMediaContent(
        "image/webp",
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).not.toThrow();
  });

  it("rejects content that does not match the declared image type", () => {
    expect(() => assertMediaContent("image/jpeg", new Uint8Array([0x3c, 0x68, 0x74]))).toThrow(
      MediaValidationError,
    );
    expect(() => assertMediaContent("image/png", jpeg(false))).toThrow(MediaValidationError);
    expect(() => assertMediaContent("image/webp", jpeg(false))).toThrow(MediaValidationError);
  });

  it("rejects a JPEG that carries a GPS EXIF directory", () => {
    expect(() => assertMediaContent("image/jpeg", jpeg(true))).toThrow(/GPS location/);
  });

  it("accepts a short MP3 and rejects one over the duration limit", () => {
    expect(() => assertMediaContent("audio/mpeg", mp3(2))).not.toThrow();
    expect(() => assertMediaContent("audio/mpeg", mp3(1200))).toThrow(
      new RegExp(`${MAX_AUDIO_SECONDS}s limit`),
    );
  });

  it("rejects a big-endian JPEG GPS directory", () => {
    const tiff = new Uint8Array([
      0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x88, 0x25, 0x00, 0x04, 0x00,
      0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01,
      0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x4e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const data = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]);
    const length = data.length + 2;

    expect(() =>
      assertMediaContent(
        "image/jpeg",
        new Uint8Array([
          0xff,
          0xd8,
          0xff,
          0xe1,
          (length >> 8) & 0xff,
          length & 0xff,
          ...data,
          0xff,
          0xd9,
        ]),
      ),
    ).toThrow(/GPS location/);
  });

  it("accepts an ID3-wrapped stream and the exact duration boundary", () => {
    const payload = 100;
    const tag = new Uint8Array([
      0x49,
      0x44,
      0x33,
      0x04,
      0x00,
      0x00,
      (payload >> 21) & 0x7f,
      (payload >> 14) & 0x7f,
      (payload >> 7) & 0x7f,
      payload & 0x7f,
    ]);
    const wrapped = new Uint8Array([...tag, ...new Uint8Array(payload), ...mp3(2)]);
    const maxFrames = Math.floor((MAX_AUDIO_SECONDS * 44100) / 1152);

    expect(() => assertMediaContent("audio/mpeg", wrapped)).not.toThrow();
    expect(() => assertMediaContent("audio/mpeg", mp3(maxFrames))).not.toThrow();
    expect(() => assertMediaContent("audio/mpeg", mp3(maxFrames + 1))).toThrow(/30s limit/);
  });

  it("does not crash on truncated APP1/TIFF segments", () => {
    expect(() =>
      assertMediaContent(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x7f, 0xff, 0x45, 0x78, 0x69, 0x66]),
      ),
    ).not.toThrow();
    expect(() =>
      assertMediaContent(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x02, 0xff, 0xd9]),
      ),
    ).not.toThrow();
  });

  it("rejects non-MP3 audio bytes", () => {
    expect(() => assertMediaContent("audio/mpeg", new TextEncoder().encode("not audio"))).toThrow(
      MediaValidationError,
    );
  });
});
