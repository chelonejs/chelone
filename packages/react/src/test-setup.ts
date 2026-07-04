/**
 * jsdom test-environment polyfills.
 *
 * jsdom implements neither `ResizeObserver` nor the pointer-capture / scroll
 * APIs that cmdk (`<Command>`) and Radix popover-based primitives call on mount
 * and on open. The choice inputs (autocomplete / select / select-array) compose
 * those primitives, so their behavior tests crash in jsdom without these shims.
 * Purely additive: each guard only defines a global when it is missing, so no
 * existing jsdom behavior changes.
 */

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
