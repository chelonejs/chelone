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

// type-escape: a guard on `unknown` learns the keys and not the values
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Could `value` have been written as an object literal? Only
 * `Object.prototype` or `null` as its prototype passes, so a Date, a Map and a
 * class instance do not.
 */
export function isPlainObject(
  value: unknown, // type-escape: a guard on `unknown` learns the keys and not the values
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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
