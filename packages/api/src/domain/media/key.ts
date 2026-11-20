import {
  MEDIA_LIMITS,
  type MediaKind,
  MediaValidationError,
} from "@aqui-suena/api/domain/media/media-kind";

const KEY_PREFIX = "media";
const KEY_VERSION = "v1";
const ACCOUNT_KINDS: readonly MediaKind[] = ["avatar"];
const SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const OBJECT_NAME_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]+)$/;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
};

export type MediaScope =
  | { readonly type: "account" }
  | { readonly type: "business"; readonly businessId: string };

export type ParsedMediaKey = {
  readonly accountId: string;
  readonly scope: MediaScope;
  readonly kind: MediaKind;
  readonly objectId: string;
  readonly extension: string;
};

export type BuildMediaKeyInput = {
  readonly accountId: string;
  readonly kind: MediaKind;
  readonly contentType: string;
  readonly businessId?: string;
  readonly objectId?: string;
};

function isMediaKind(value: string | undefined): value is MediaKind {
  return value !== undefined && Object.hasOwn(MEDIA_LIMITS, value);
}

function isSegment(value: string | undefined): value is string {
  return value !== undefined && SEGMENT_PATTERN.test(value) && value !== "." && value !== "..";
}

function requireSegment(value: string, field: string): void {
  if (!isSegment(value)) {
    throw new MediaValidationError(`${field} must be a single path segment`);
  }
}

export function mediaExtensionFor(kind: MediaKind, contentType: string): string {
  const limits = Object.hasOwn(MEDIA_LIMITS, kind)
    ? (MEDIA_LIMITS as Record<string, { allowedMimeTypes: readonly string[] } | undefined>)[kind]
    : undefined;

  const extension = EXTENSIONS[contentType];

  if (limits === undefined) {
    throw new MediaValidationError(`Unknown media kind: ${String(kind)}`);
  }

  if (extension === undefined || !limits.allowedMimeTypes.includes(contentType)) {
    throw new MediaValidationError(
      `Unsupported content type '${contentType}' for ${kind}. Allowed: ${limits.allowedMimeTypes.join(", ")}`,
    );
  }

  return extension;
}

export function resolveMediaScope(kind: MediaKind, businessId: string | undefined): MediaScope {
  if (!isMediaKind(kind)) {
    throw new MediaValidationError(`Unknown media kind: ${String(kind)}`);
  }

  if (ACCOUNT_KINDS.includes(kind)) {
    if (businessId !== undefined) {
      throw new MediaValidationError(`${kind} is account media and cannot carry a businessId`);
    }

    return { type: "account" };
  }

  if (businessId === undefined || businessId.length === 0) {
    throw new MediaValidationError(`${kind} requires a businessId`);
  }

  requireSegment(businessId, "businessId");

  return { type: "business", businessId };
}

export function buildMediaKey(input: BuildMediaKeyInput): string {
  requireSegment(input.accountId, "accountId");

  const scope = resolveMediaScope(input.kind, input.businessId);
  const extension = mediaExtensionFor(input.kind, input.contentType);
  const objectId = input.objectId ?? crypto.randomUUID();

  if (!UUID_PATTERN.test(objectId)) {
    throw new MediaValidationError("objectId must be a UUID");
  }

  const scopeSegment = scope.type === "account" ? "account" : `businesses/${scope.businessId}`;

  return `${KEY_PREFIX}/${KEY_VERSION}/${input.accountId}/${scopeSegment}/${input.kind}/${objectId}.${extension}`;
}

function isExtensionAllowed(kind: MediaKind, extension: string): boolean {
  const limits = MEDIA_LIMITS[kind];

  return limits.allowedMimeTypes.some((mime) => EXTENSIONS[mime] === extension);
}

function parseScope(segments: string[]): ParsedMediaKey | null {
  const accountId = segments[2];

  const scopeTag = segments[3];

  if (!isSegment(accountId)) return null;

  if (scopeTag === "account") {
    if (segments.length !== 6) return null;

    const kind = segments[4];

    const file = segments[5];

    return kind === undefined || file === undefined
      ? null
      : parseObject({ accountId, scope: { type: "account" }, kind, file });
  }

  if (scopeTag === "businesses") {
    if (segments.length !== 7) return null;

    const businessId = segments[4];
    const kind = segments[5];
    const file = segments[6];

    if (!isSegment(businessId) || kind === undefined || file === undefined) return null;

    return parseObject({ accountId, scope: { type: "business", businessId }, kind, file });
  }

  return null;
}

function parseObject(input: {
  accountId: string;
  scope: MediaScope;
  kind: string;
  file: string;
}): ParsedMediaKey | null {
  if (!isMediaKind(input.kind)) return null;

  const accountScoped = input.scope.type === "account";

  if (ACCOUNT_KINDS.includes(input.kind) !== accountScoped) return null;

  const match = OBJECT_NAME_PATTERN.exec(input.file);

  if (match === null) return null;

  const objectId = match[1];
  const extension = match[2];

  if (objectId === undefined || extension === undefined) return null;

  if (!isExtensionAllowed(input.kind, extension)) return null;

  return {
    accountId: input.accountId,
    scope: input.scope,
    kind: input.kind,
    objectId,
    extension,
  };
}

export function parseMediaKey(key: string): ParsedMediaKey | null {
  const segments = key.split("/");

  if (segments[0] !== KEY_PREFIX || segments[1] !== KEY_VERSION) return null;

  return parseScope(segments);
}
