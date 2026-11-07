import type { ValidationMessage, Validator } from "../form/validators";
import { isEmpty } from "../form/validators";

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** How far north or south a latitude goes. */
export const LATITUDE_LIMIT = 90;

/** How far east or west a longitude goes. */
export const LONGITUDE_LIMIT = 180;

/**
 * A longitude from a repeated copy of the world, back into -180..180. MapLibre
 * tiles the world side by side, so a click east of the last copy reports a
 * longitude past 180, by any number of turns.
 */
export function wrapLongitude(longitude: number): number {
  if (Math.abs(longitude) <= LONGITUDE_LIMIT) return longitude;
  return (
    ((((longitude + LONGITUDE_LIMIT) % 360) + 360) % 360) - LONGITUDE_LIMIT
  );
}

/** A finite number from a number or a numeric string, else `null`. `0` is valid. */
export function toCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!NUMERIC.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function rangeValidator(
  min: number,
  max: number,
  message: ValidationMessage,
): Validator {
  return (value, values) => {
    if (isEmpty(value)) return undefined;
    const coordinate = toCoordinate(value);
    if (coordinate !== null && coordinate >= min && coordinate <= max) {
      return undefined;
    }
    const args = { min, max };
    return typeof message === "function"
      ? message({ args, value, values })
      : { message, args };
  };
}

/** Errors outside -90..90 (or on a non-number). Skips empty values. */
export function latitude(
  message: ValidationMessage = "chelone.validation.latitude",
): Validator {
  return rangeValidator(-LATITUDE_LIMIT, LATITUDE_LIMIT, message);
}

/** Errors outside -180..180 (or on a non-number). Skips empty values. */
export function longitude(
  message: ValidationMessage = "chelone.validation.longitude",
): Validator {
  return rangeValidator(-LONGITUDE_LIMIT, LONGITUDE_LIMIT, message);
}
