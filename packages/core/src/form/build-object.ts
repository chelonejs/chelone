/**
 * One object built key by key, typed as the object the caller names. The cast
 * such a build needs lives here, so the builders that walk keys need none of
 * their own.
 *
 * The entries are collected into an array first: `fromEntries` resolving an
 * `Iterable` argument costs the compiler about 300 types per program, an array
 * argument about 15 (`pnpm check:type-cost` catches the difference).
 *
 * `fromEntries` DEFINES every key instead of assigning it, so a key named
 * `__proto__` becomes an own property of the built object and never touches
 * its prototype.
 */
export function buildObject<T extends object>(
  // type-escape: builder: the entries come from a runtime walk; `T` names the object they build
  entries: Iterable<readonly [string, unknown]>,
): T {
  // type-escape: builder: `fromEntries` knows each value, not the shape `T` names
  return Object.fromEntries([...entries]) as T;
}
