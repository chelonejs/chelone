/**
 * Narrowing helpers for tests. Private to this workspace: nothing test-only
 * ships to an app. Imports no Chelone package, so any package can depend on it,
 * core included.
 *
 * The registered tests' compile probe lives in its own subpath,
 * `@chelone/test-utils/compile-probe`, so `typescript` stays out of this entry.
 */

/** Returns the value, throwing at the line that produced the missing one. */
export function defined<T>(value: T | null | undefined): T {
  if (value == null) throw new Error(`Expected a value, got ${value}`);
  return value;
}

/** Returns `node` as `T`, throwing when it is missing or another element. */
export function elementOf<T extends Element>(
  node: Node | null | undefined,
  type: new () => T,
): T {
  if (!(node instanceof type)) throw new Error(`Expected ${type.name}`);
  return node;
}

/**
 * A whole `IntersectionObserverEntry`, as the browser hands one: only
 * `isIntersecting` varies. A fake observer hands its callback the full entry, so
 * a test that reports "in view" needs every field, not a partial object.
 */
export function intersectionEntry(
  isIntersecting: boolean,
): IntersectionObserverEntry {
  const rect: DOMRectReadOnly = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  };
  return {
    isIntersecting,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: null,
    intersectionRatio: isIntersecting ? 1 : 0,
    target: document.createElement("div"),
    time: 0,
  };
}
