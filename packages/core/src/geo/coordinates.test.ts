import { describe, expect, it } from "vitest";
import { minLength, type ValidatorResult } from "../form/validators";
import { latitude, longitude, toCoordinate } from "./coordinates";

/** The keys of a validator's failure payload, checked at this line. */
async function errorKeys(
  verdict: ValidatorResult | Promise<ValidatorResult>,
): Promise<string[]> {
  const result = await verdict;
  if (typeof result !== "object" || result === null) {
    throw new Error(`Expected an error payload, got ${String(result)}`);
  }
  return Object.keys(result).sort();
}

describe("toCoordinate", () => {
  it("accepts 0 and numeric strings and rejects null, empty string and NaN", () => {
    expect(toCoordinate(0)).toBe(0);
    expect(toCoordinate("0")).toBe(0);
    expect(toCoordinate(48.85)).toBe(48.85);
    expect(toCoordinate("48.85")).toBe(48.85);
    expect(toCoordinate(" -2.35 ")).toBe(-2.35);
    expect(toCoordinate(null)).toBeNull();
    expect(toCoordinate(undefined)).toBeNull();
    expect(toCoordinate("")).toBeNull();
    expect(toCoordinate("  ")).toBeNull();
    expect(toCoordinate(Number.NaN)).toBeNull();
  });

  it("rejects infinities, text and other types", () => {
    expect(toCoordinate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toCoordinate("Infinity")).toBeNull();
    expect(toCoordinate("abc")).toBeNull();
    expect(toCoordinate("12abc")).toBeNull();
    expect(toCoordinate("0x10")).toBeNull();
    expect(toCoordinate(true)).toBeNull();
    expect(toCoordinate([1])).toBeNull();
  });
});

describe("latitude", () => {
  it("rejects 91 and accepts -90", () => {
    expect(latitude()(91, {}, {})).toEqual({
      message: "chelone.validation.latitude",
      args: { min: -90, max: 90 },
    });
    expect(latitude()(-90, {}, {})).toBeUndefined();
    expect(latitude()(90, {}, {})).toBeUndefined();
    expect(latitude()(-90.0001, {}, {})).toEqual({
      message: "chelone.validation.latitude",
      args: { min: -90, max: 90 },
    });
  });

  it("accepts zero and numeric strings", () => {
    expect(latitude()(0, {}, {})).toBeUndefined();
    expect(latitude()("48.85", {}, {})).toBeUndefined();
    expect(latitude()("91", {}, {})).toBeTruthy();
  });

  it("fails a value that is not a number", () => {
    expect(latitude()("north", {}, {})).toBeTruthy();
    expect(latitude()(Number.NaN, {}, {})).toBeTruthy();
  });

  it("uses a custom message key", () => {
    expect(latitude("my.key")(100, {}, {})).toEqual({
      message: "my.key",
      args: { min: -90, max: 90 },
    });
  });

  it("uses a message factory", () => {
    expect(latitude(({ value }) => `bad ${String(value)}`)(100, {}, {})).toBe(
      "bad 100",
    );
  });

  it("returns the same shape as minLength", async () => {
    expect(await errorKeys(minLength(3)("a", {}, {}))).toEqual(
      await errorKeys(latitude()(91, {}, {})),
    );
  });
});

describe("longitude", () => {
  it("skips an empty value", () => {
    expect(longitude()(undefined, {}, {})).toBeUndefined();
    expect(longitude()(null, {}, {})).toBeUndefined();
    expect(longitude()("", {}, {})).toBeUndefined();
    expect(longitude()([], {}, {})).toBeUndefined();
  });

  it("rejects outside -180..180 and accepts the edges", () => {
    expect(longitude()(181, {}, {})).toEqual({
      message: "chelone.validation.longitude",
      args: { min: -180, max: 180 },
    });
    expect(longitude()(-181, {}, {})).toBeTruthy();
    expect(longitude()(-180, {}, {})).toBeUndefined();
    expect(longitude()(180, {}, {})).toBeUndefined();
    expect(longitude()(0, {}, {})).toBeUndefined();
  });
});
