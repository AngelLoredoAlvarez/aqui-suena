import { MediaValidationError } from "@aqui-suena/api/domain/media/media-kind";

export const MAX_AUDIO_SECONDS = 30;

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function assertJpeg(bytes: Uint8Array): void {
  if (!startsWith(bytes, JPEG_SIGNATURE)) {
    throw new MediaValidationError("Uploaded content is not a JPEG image");
  }
}

function assertPng(bytes: Uint8Array): void {
  if (!startsWith(bytes, PNG_SIGNATURE)) {
    throw new MediaValidationError("Uploaded content is not a PNG image");
  }
}

function assertWebp(bytes: Uint8Array): void {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new MediaValidationError("Uploaded content is not a WebP image");
  }
}

function readUint16(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  const first = bytes[offset] ?? 0;
  const second = bytes[offset + 1] ?? 0;

  return littleEndian ? first | (second << 8) : (first << 8) | second;
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  const first = bytes[offset] ?? 0;
  const second = bytes[offset + 1] ?? 0;
  const third = bytes[offset + 2] ?? 0;
  const fourth = bytes[offset + 3] ?? 0;

  return littleEndian
    ? first | (second << 8) | (third << 16) | (fourth << 24)
    : (first << 24) | (second << 16) | (third << 8) | fourth;
}

function hasGpsExif(tiff: Uint8Array): boolean {
  if (tiff.length < 8) return false;

  const order = ascii(tiff, 0, 2);
  const littleEndian = order === "II";

  if (!littleEndian && order !== "MM") return false;
  if (readUint16(tiff, 2, littleEndian) !== 0x2a) return false;

  const ifdOffset = readUint32(tiff, 4, littleEndian);
  if (ifdOffset + 2 > tiff.length) return false;

  const count = readUint16(tiff, ifdOffset, littleEndian);

  for (let index = 0; index < count; index += 1) {
    const entry = ifdOffset + 2 + index * 12;

    if (entry + 12 > tiff.length) return false;

    const tag = readUint16(tiff, entry, littleEndian);

    if (tag !== 0x8825) continue;

    const gpsOffset = readUint32(tiff, entry + 8, littleEndian);

    return gpsOffset + 2 <= tiff.length && readUint16(tiff, gpsOffset, littleEndian) > 0;
  }

  return false;
}

function assertNoGpsExif(bytes: Uint8Array): void {
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return;

    const marker = bytes[offset + 1] ?? 0;

    if (marker === 0xd9 || marker === 0xda) return;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = readUint16(bytes, offset + 2, false);
    if (length < 2 || offset + 2 + length > bytes.length) return;

    const data = offset + 4;

    if (marker === 0xe1 && ascii(bytes, data, 4) === "Exif" && hasGpsExif(bytes.slice(data + 6))) {
      throw new MediaValidationError("Image metadata must not contain GPS location");
    }

    offset += 2 + length;
  }
}

const MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_LAYER3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, readonly number[]> = {
  0: [11025, 12000, 8000],
  2: [22050, 24000, 16000],
  3: [44100, 48000, 32000],
};

function mp3DurationSeconds(bytes: Uint8Array): number {
  let offset = 0;

  if (ascii(bytes, 0, 3) === "ID3" && bytes.length >= 10) {
    const size =
      ((bytes[6] ?? 0) & 0x7f) * 2 ** 21 +
      ((bytes[7] ?? 0) & 0x7f) * 2 ** 14 +
      ((bytes[8] ?? 0) & 0x7f) * 2 ** 7 +
      ((bytes[9] ?? 0) & 0x7f);

    offset = 10 + size;
  }

  let seconds = 0;
  let frames = 0;
  const end =
    bytes.length >= 128 && ascii(bytes, bytes.length - 128, 3) === "TAG"
      ? bytes.length - 128
      : bytes.length;

  while (offset + 4 <= end) {
    const header =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0);

    if (header >>> 21 !== 0x7ff) break;

    const version = (header >>> 19) & 0x3;
    const layer = (header >>> 17) & 0x3;
    const bitrateIndex = (header >>> 12) & 0xf;
    const sampleRateIndex = (header >>> 10) & 0x3;
    const padding = (header >>> 9) & 0x1;
    const table = version === 3 ? MPEG1_LAYER3_BITRATES : MPEG2_LAYER3_BITRATES;
    const bitrate = table[bitrateIndex] ?? 0;
    const sampleRate = SAMPLE_RATES[version]?.[sampleRateIndex] ?? 0;

    if (layer !== 1 || bitrate === 0 || sampleRate === 0) break;

    const samplesPerFrame = version === 3 ? 1152 : 576;
    const frameLength =
      Math.floor(((version === 3 ? 144 : 72) * bitrate * 1000) / sampleRate) + padding;

    if (frameLength < 4 || offset + frameLength > end) break;

    seconds += samplesPerFrame / sampleRate;
    frames += 1;
    offset += frameLength;
  }

  if (frames === 0) {
    throw new MediaValidationError("Uploaded audio is not a valid MP3 stream");
  }

  return seconds;
}

export function assertMediaContent(contentType: string, bytes: Uint8Array): void {
  switch (contentType) {
    case "image/jpeg":
      assertJpeg(bytes);
      assertNoGpsExif(bytes);
      return;
    case "image/png":
      assertPng(bytes);
      return;
    case "image/webp":
      assertWebp(bytes);
      return;
    case "audio/mpeg": {
      if (
        !(
          ascii(bytes, 0, 3) === "ID3" ||
          ((bytes[0] ?? 0) === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
        )
      ) {
        throw new MediaValidationError("Uploaded content is not an MP3 file");
      }

      if (mp3DurationSeconds(bytes) > MAX_AUDIO_SECONDS) {
        throw new MediaValidationError(`Audio exceeds the ${MAX_AUDIO_SECONDS}s limit`);
      }
      return;
    }
    default:
      throw new MediaValidationError(`Unsupported content type: ${contentType}`);
  }
}
