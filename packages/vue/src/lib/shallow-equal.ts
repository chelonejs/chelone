/**
 * `shallowEqual(a, b)` — shallow equality with `Object.is` semantics at the top
 * level, the Vue twin of `@chelone/react`'s `util/shallow-equal.ts` (parity with
 * ra-core's `shallowEqual`). Used by `<FileInput>` to identify the file to drop
 * from a `multiple` value array (file records are compared by their own
 * enumerable keys, not by reference, so a re-`format`ted copy still matches).
 *
 * - reference-equal inputs (and `Object.is`-equal primitives) are equal;
 * - `+0` / `-0` are NOT equal, `NaN` / `NaN` ARE equal (Object.is);
 * - two objects/arrays are equal iff they have the same own enumerable keys and
 *   each value pair is `Object.is`-equal — nested values are compared by
 *   reference only (shallow);
 * - a non-object (or `null`) that is not reference-equal is unequal.
 */

/** Local `Object.is` (matches ra-core's polyfill so behavior is identical). */
function is(x: unknown, y: unknown): boolean {
  if (x === y) {
    // Distinguish +0 from -0: 1/+0 === +Infinity, 1/-0 === -Infinity.
    return x !== 0 || y !== 0 || 1 / (x as number) === 1 / (y as number);
  }
  // The only pair that is not `===` yet should be equal: NaN and NaN.
  return Number.isNaN(x) && Number.isNaN(y);
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (is(a, b)) return true;

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
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.hasOwn(b, key) ||
      !is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }
  return true;
}
