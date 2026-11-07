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
 */

import { configure } from "@testing-library/react";

// A docs reference page imports its live demo through `import.meta.glob`, so a
// test that waits for the demo is also waiting on a module load. On a contended
// CI runner that load can pass testing-library's 1000ms default and the test
// fails with "Unable to find role=..." while the import is still running. The
// budget is wide so the load is never what is under test.
configure({ asyncUtilTimeout: 10_000 });

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
