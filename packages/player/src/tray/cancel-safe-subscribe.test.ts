import { describe, expect, it, vi } from "vitest";
import { cancelSafeSubscribe } from "./cancel-safe-subscribe";
import type { Unsubscribe } from "./tray-bridge";

function deferred() {
  let resolve: (release: Unsubscribe) => void = () => {};

  const promise = new Promise<Unsubscribe>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("cancelSafeSubscribe", () => {
  it("releases when unsubscribed after the subscription resolves", async () => {
    const release = vi.fn();
    const pending = deferred();
    const attach = vi.fn(() => pending.promise);
    const unsubscribe = cancelSafeSubscribe(attach);

    pending.resolve(release);
    await flush();
    unsubscribe();

    expect(attach).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected subscription instead of leaving it unhandled", async () => {
    const failure = new Error("event permission denied");
    const report = vi.spyOn(console, "error").mockImplementation(() => {});

    cancelSafeSubscribe(() => Promise.reject(failure));
    await flush();

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      "tray subscription failed; tray events will not arrive",
      failure,
    );

    report.mockRestore();
  });

  it("releases on arrival when unsubscribed before the subscription resolves", async () => {
    const release = vi.fn();
    const pending = deferred();
    const unsubscribe = cancelSafeSubscribe(() => pending.promise);

    unsubscribe();

    expect(release).not.toHaveBeenCalled();

    pending.resolve(release);
    await flush();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it("releases once when unsubscribed twice", async () => {
    const release = vi.fn();
    const pending = deferred();
    const unsubscribe = cancelSafeSubscribe(() => pending.promise);

    pending.resolve(release);
    await flush();

    unsubscribe();
    unsubscribe();

    expect(release).toHaveBeenCalledTimes(1);
  });
});
