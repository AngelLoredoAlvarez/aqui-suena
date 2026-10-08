// Vitest setup: jsdom ships no matchMedia, but Tamagui reads it at import
// time, so the stub must run before any test file imports shared UI.
// Guarded: node-environment suites have no window at all.
if (typeof window !== "undefined" && !window.matchMedia) {
  const noop = () => {};
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }),
  });
}
