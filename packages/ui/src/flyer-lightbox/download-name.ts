const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function extensionFor(imageUrl: string): string {
  const match = /\.([a-z0-9]+)(?:$|\?)/i.exec(imageUrl);
  const extension = match?.[1]?.toLowerCase();

  return extension !== undefined && SUPPORTED_EXTENSIONS.includes(extension) ? extension : "jpg";
}

function slug(name: string): string {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function flyerDownloadName(name: string, imageUrl: string): string {
  const base = slug(name);

  return `${base.length > 0 ? `flyer-${base}` : "flyer"}.${extensionFor(imageUrl)}`;
}
