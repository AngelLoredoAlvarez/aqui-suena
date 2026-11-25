import { flyerDownloadName } from "@aqui-suena/ui/flyer-lightbox/download-name";

export async function downloadFlyer(imageUrl: string, name: string): Promise<void> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download the flyer (${response.status})`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = flyerDownloadName(name, imageUrl);
  anchor.rel = "noopener";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
