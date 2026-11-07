/**
 * jsdom test-environment polyfills for the demo's render tests — the same
 * additive guards `packages/react/src/test-setup.ts` installs for the package's
 * own suite, kept here because the demo mounts the shell whole.
 *
 * `<CommandMenu>` (cmdk) and `<ThemeProvider>` read `window.matchMedia`; cmdk
 * and the Radix popovers call `ResizeObserver`; `<ThemeProvider>` persists to
 * `localStorage`, which Node shadows with an undefined global. Each guard only
 * defines a global when it is missing.
 */

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = function matchMedia(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    };
  };
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

if (typeof globalThis.localStorage === "undefined") {
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
      clear: () => entries.clear(),
      key: (index: number) => [...entries.keys()][index] ?? null,
      get length() {
        return entries.size;
      },
    },
  });
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollTo(): void {};
  }
}
