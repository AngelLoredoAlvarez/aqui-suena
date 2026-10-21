import type { Unsubscribe } from "./tray-bridge";

export function cancelSafeSubscribe(attach: () => Promise<Unsubscribe>): Unsubscribe {
  let release: Unsubscribe | undefined;
  let cancelled = false;

  void attach().then((stop) => {
    if (cancelled) {
      stop();
      return;
    }

    release = stop;
  });

  return () => {
    cancelled = true;

    const stop = release;
    release = undefined;
    stop?.();
  };
}
