/**
 * Read a seed record out of a location: the framework-free twin of ra-core's
 * `useRecordFromLocation`. A router adapter passes its `CheloneLocation`;
 * the clone link writes `?source=<json>`.
 */

import type { CheloneLocation } from "./location";

export interface RecordFromLocationOptions {
  /** Search param holding the JSON record. Default `source`. */
  searchSource?: string;
  /** Key in `location.state` holding the record. Default `record`. */
  stateSource?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The record at `state[stateSource]` if it is an object, else the JSON in the
 * `searchSource` param. Returns `null` for no param, invalid JSON, a repeated
 * param or a value that is not a plain object. Never throws.
 */
export function getRecordFromLocation(
  location: Pick<CheloneLocation, "state" | "searchParams">,
  options: RecordFromLocationOptions = {},
): Record<string, unknown> | null {
  const { searchSource = "source", stateSource = "record" } = options;

  const fromState = isPlainObject(location.state)
    ? location.state[stateSource]
    : undefined;
  if (isPlainObject(fromState)) return fromState;

  const values = location.searchParams.getAll(searchSource);
  if (values.length !== 1) return null;
  try {
    const parsed: unknown = JSON.parse(values[0] as string);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
