/**
 * Core's object guards, in one place. Two questions, each answered once:
 * `isRecord` — is it an object at all, so a Date, a Map and a class instance
 * pass; `isPlainObject` — could a caller have written it as an object literal,
 * which needs `Object.prototype` or `null` as its prototype. `isJsonObject`
 * answers a third question, about what a value holds all the way down.
 */

/** What JSON can hold: the members of a parsed document. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | JsonObject;

/** An object whose every member is a JSON value. */
export type JsonObject = { [key: string]: JsonValue };

// type-escape: json: a guard on `unknown` learns the keys and not the values
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Could `value` have been written as an object literal? Only
 * `Object.prototype` or `null` as its prototype passes, so a Date, a Map and a
 * class instance do not.
 */
export function isPlainObject(
  value: unknown, // type-escape: json: a guard on `unknown` learns the keys and not the values
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * An object that holds `key`, so `value[key]` reads without a cast. The
 * member's type is `unknown`: the guard proves it is there, not what it is.
 */
export function hasProperty<TKey extends string>(
  value: unknown,
  key: TKey,
  // type-escape: json: a guard on `unknown` learns the key and not its value
): value is Record<TKey, unknown> {
  return isRecord(value) && key in value;
}

/**
 * Could `await value` wait on it? A promise, or any object with a `then`
 * function. A bare function is refused even when it has no `then`.
 */
// type-escape: server: a guard on `unknown` learns that `then` is callable, not what it resolves to
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return hasProperty(value, "then") && typeof value.then === "function";
}

/**
 * True when `value` is an object JSON could have produced: plain objects and
 * arrays down to strings, finite numbers, booleans and null. `NaN` and
 * `Infinity` are refused, because `JSON.stringify` turns them into `null`, and
 * so is a value that contains itself.
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return isPlainObject(value) && isJsonValue(value, new WeakSet<object>());
}

/**
 * Could `new Headers(value)` take it? A `Headers`, a list of `[name, value]`
 * pairs, or a record whose every value is a string. A pair list holding a
 * non-string, and a record holding a number or a null, are refused: `Headers`
 * would read them as names and values it was never given.
 */
export function isHeadersInit(value: unknown): value is HeadersInit {
  if (value instanceof Headers) return true;
  if (Array.isArray(value)) return value.every(isHeaderPair);
  return (
    isPlainObject(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/** One `[name, value]` header pair. A longer or shorter array is not one. */
function isHeaderPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  );
}

/**
 * The deep half of `isJsonObject`. `path` holds the containers `value` sits
 * inside, so a value that contains itself is refused instead of walked
 * forever; a shared sub-object, which no container holds twice on one path,
 * still passes.
 */
function isJsonValue(
  value: unknown,
  path: WeakSet<object>,
): value is JsonValue {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) {
    if (path.has(value)) return false;
    path.add(value);
    const held = value.every((item) => isJsonValue(item, path));
    path.delete(value);
    return held;
  }
  if (!isPlainObject(value)) return false;
  if (path.has(value)) return false;
  path.add(value);
  const held = Object.values(value).every((item) => isJsonValue(item, path));
  path.delete(value);
  return held;
}
