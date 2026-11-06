/**
 * Narrowing helpers for tests. Private to this workspace: nothing test-only
 * ships to an app. Imports no Chelone package, so any package can depend on it,
 * core included.
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
