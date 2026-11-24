import { useEffect } from "react";

const prefetched = new Set<string>();

export function useImagePrefetch(urls: readonly string[]): void {
  const key = urls.join("\n");

  useEffect(() => {
    for (const url of key.split("\n")) {
      if (url.length === 0 || prefetched.has(url)) continue;

      prefetched.add(url);
      const image = new Image();
      image.src = url;
    }
  }, [key]);
}
