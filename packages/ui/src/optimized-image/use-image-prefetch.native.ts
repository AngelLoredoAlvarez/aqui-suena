import { Image } from "expo-image";
import { useEffect } from "react";

const prefetched = new Set<string>();

export function useImagePrefetch(urls: readonly string[]): void {
  const key = urls.join("\n");

  useEffect(() => {
    const pending = key.split("\n").filter((url) => url.length > 0 && !prefetched.has(url));

    if (pending.length === 0) return;

    for (const url of pending) {
      prefetched.add(url);
    }

    void Image.prefetch(pending, "memory-disk");
  }, [key]);
}
