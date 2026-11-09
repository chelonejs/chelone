import { isPlainObject } from "../guards";

/**
 * Are `a` and `b` the same value? `===` answers for anything that is the same
 * value; arrays compare by order and length; plain objects compare by content
 * whatever order their keys were written in. A key whose value is `undefined`
 * counts as absent, the way `JSON.stringify` counts it. Anything that is not a
 * plain object - a Date, a Map, a class instance - is equal to itself only.
 */
export function deepEqual<T>(a: T, b: T): boolean {
  return a === b || sameContent(a, b);
}

// type-escape: context: the walk holds values whose type the caller's generic has erased
function sameContent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && sameList(a, b);
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a).filter((key) => a[key] !== undefined);
  const others = Object.keys(b).filter((key) => b[key] !== undefined);
  return (
    keys.length === others.length &&
    keys.every((key) => sameContent(a[key], b[key]))
  );
}

// type-escape: context: an array's members are values the caller's generic has erased
function sameList(a: readonly unknown[], b: readonly unknown[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => sameContent(item, b[index]))
  );
}
