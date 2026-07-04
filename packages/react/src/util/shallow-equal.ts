/**
 * `shallowEqual(a, b)` — shallow equality with `Object.is` semantics at the top
 * level. Parity with ra-core's `shallowEqual`.
 *
 * - reference-equal inputs (and `Object.is`-equal primitives) are equal;
 * - `+0` / `-0` are NOT equal, `NaN` / `NaN` ARE equal (Object.is);
 * - two objects/arrays are equal iff they have the same own enumerable keys and
 *   each value pair is `Object.is`-equal — nested values are compared by
 *   reference only (shallow);
 * - a non-object (or `null`) that is not reference-equal is unequal.
 */

// Local `Object.is` reimplementation, matching the polyfill ra-core ships so
// behavior is identical on engines without `Object.is` (parity, not reliance
// on the native method's presence).
function is(x: unknown, y: unknown): boolean {
  if (x === y) {
    // Distinguish +0 from -0: 1/+0 === +Infinity, 1/-0 === -Infinity.
    return x !== 0 || y !== 0 || 1 / (x as number) === 1 / (y as number);
  }
  // The only pair that is not `===` yet should be equal: NaN and NaN.
  // (`Number.isNaN` is false for any non-number, matching the `x !== x` idiom.)
  return Number.isNaN(x) && Number.isNaN(y);
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (is(a, b)) {
    return true;
  }

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  const objB = b as Record<string, unknown>;
  const objA = a as Record<string, unknown>;
  for (const key of keysA) {
    if (!Object.hasOwn(objB, key) || !is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}
