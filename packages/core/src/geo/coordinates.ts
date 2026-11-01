import type { ValidationMessage, Validator } from "../form/validators";
import { isEmpty } from "../form/validators";

const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

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
  return rangeValidator(-90, 90, message);
}

/** Errors outside -180..180 (or on a non-number). Skips empty values. */
export function longitude(
  message: ValidationMessage = "chelone.validation.longitude",
): Validator {
  return rangeValidator(-180, 180, message);
}
