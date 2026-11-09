/**
 * `shallowEqual(a, b)`: shallow equality with `Object.is` semantics at the top
 * level. Parity with ra-core's `shallowEqual`.
 *
 * - `Object.is`-equal inputs are equal, so `NaN` equals `NaN` and `0` differs
 *   from `-0`;
 * - two objects or arrays are equal iff they have the same own enumerable keys
 *   and each value pair is `Object.is`-equal; nested values compare by
 *   reference;
 * - a non-object, or `null`, that is not `Object.is`-equal is unequal.
 */
// type-escape: context: it compares any two values, so both parameters are unknown
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
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
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is(Reflect.get(a, key), Reflect.get(b, key)),
  );
}
