/**
 * A copy of `source` that keeps what a spread drops: methods on the prototype
 * chain of a class instance, bound to `source` so they still see its state.
 */
export function copyMembers<T extends object>(source: T): T {
  const copy: Record<PropertyKey, unknown> = { ...(source as object) };
  let proto = Object.getPrototypeOf(source);
  while (proto && proto !== Object.prototype) {
    for (const key of Reflect.ownKeys(proto)) {
      if (key === "constructor" || Object.hasOwn(copy, key)) continue;
      const { value } = Object.getOwnPropertyDescriptor(proto, key) ?? {};
      if (typeof value === "function") copy[key] = value.bind(source);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return copy as T;
}
