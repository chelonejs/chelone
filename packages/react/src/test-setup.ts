/**
 * jsdom test-environment polyfills.
 *
 * jsdom implements neither `ResizeObserver` nor the pointer-capture / scroll
 * APIs that cmdk (`<Command>`) and Radix popover-based primitives call on mount
 * and on open. The choice inputs (autocomplete / select / select-array) compose
 * those primitives, so their behavior tests crash in jsdom without these shims.
 * Purely additive: each guard only defines a global when it is missing, so no
 * existing jsdom behavior changes.
 *
 * `<FileInput>` (react-dropzone) additionally calls `URL.createObjectURL` /
 * `URL.revokeObjectURL` on every dropped file to build a preview blob URL; jsdom
 * implements neither and throws "Not implemented", aborting the drop — so those
 * are stubbed too (same additive-guard pattern).
 *
 * `<Notification>` (sonner `<Toaster>`) and `<ThemeProvider>` (system-mode
 * resolution) read `window.matchMedia("(prefers-color-scheme: dark)")`; jsdom
 * ships no `matchMedia`, so a light-mode-default stub is provided.
 *
 * jsdom's `window.scrollTo` logs "Not implemented" and does nothing; TanStack
 * and the scroll manager call it on every navigation, so it is a no-op here.
 * Tests that assert on it spy with `vi.spyOn(window, "scrollTo")`.
 */

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without vitest globals Testing Library cannot register its own cleanup, so a
// render stays mounted and its query timers fire after jsdom is torn down.
afterEach(cleanup);

if (typeof URL !== "undefined") {
  if (typeof URL.createObjectURL !== "function") {
    URL.createObjectURL = function createObjectURL(): string {
      return "blob:jsdom/preview";
    };
  }
  if (typeof URL.revokeObjectURL !== "function") {
    URL.revokeObjectURL = function revokeObjectURL(): void {};
  }
}

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
    } as MediaQueryList;
  };
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    writable: true,
    value: () => {},
  });
}

// Node 25+ defines a `localStorage` global that is undefined without
// `--localstorage-file` and shadows jsdom's; `<ThemeProvider>` persists there
// when no store is configured.
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

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {};
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollTo(): void {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture =
      function hasPointerCapture(): boolean {
        return false;
      };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function setPointerCapture(): void {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture =
      function releasePointerCapture(): void {};
  }
}
