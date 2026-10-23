import { useEffect } from "react";

export function useEscapeToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (typeof document === "undefined" || !open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}
