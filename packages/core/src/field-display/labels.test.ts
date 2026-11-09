import { describe, expect, it } from "vitest";
import {
  booleanFieldDisplay,
  defaultRecordRepresentation,
  emailFieldHref,
  ratingStars,
} from "./labels";

describe("booleanFieldDisplay", () => {
  it("is null for a non-boolean value with looseValue off", () => {
    for (const value of ["maybe", "", 1, 0, null, undefined, {}, []]) {
      expect(booleanFieldDisplay(value)).toBeNull();
    }
  });

  it("labels a strict boolean with the chelone keys", () => {
    expect(booleanFieldDisplay(true)).toEqual({
      truthy: true,
      labelKey: "chelone.boolean.true",
    });
    expect(booleanFieldDisplay(false)).toEqual({
      truthy: false,
      labelKey: "chelone.boolean.false",
    });
  });

  it("coerces any value under looseValue", () => {
    for (const value of [1, "x", "false", [], {}, "true"]) {
      expect(booleanFieldDisplay(value, { looseValue: true })).toEqual({
        truthy: true,
        labelKey: "chelone.boolean.true",
      });
    }
    for (const value of [0, "", null, undefined]) {
      expect(booleanFieldDisplay(value, { looseValue: true })).toEqual({
        truthy: false,
        labelKey: "chelone.boolean.false",
      });
    }
  });

  it("prefers a custom label over the default key", () => {
    expect(booleanFieldDisplay(true, { valueLabelTrue: "Yes!" })).toEqual({
      truthy: true,
      labelKey: "Yes!",
    });
    expect(booleanFieldDisplay(false, { valueLabelFalse: "Nope" })).toEqual({
      truthy: false,
      labelKey: "Nope",
    });
  });

  it("ignores the label for the other side", () => {
    expect(booleanFieldDisplay(true, { valueLabelFalse: "Nope" })).toEqual({
      truthy: true,
      labelKey: "chelone.boolean.true",
    });
    expect(booleanFieldDisplay(false, { valueLabelTrue: "Yes!" })).toEqual({
      truthy: false,
      labelKey: "chelone.boolean.false",
    });
  });

  it("falls back to the default key for an empty custom label", () => {
    expect(booleanFieldDisplay(true, { valueLabelTrue: "" })).toEqual({
      truthy: true,
      labelKey: "chelone.boolean.true",
    });
  });
});

describe("ratingStars", () => {
  it("fills whole stars up to the value", () => {
    expect(ratingStars(3)).toEqual({
      value: 3,
      stars: ["filled", "filled", "filled", "empty", "empty"],
    });
  });

  it("splits the star at x.5 under allowHalf", () => {
    expect(ratingStars(2.5, { allowHalf: true })).toEqual({
      value: 2.5,
      stars: ["filled", "filled", "half", "empty", "empty"],
    });
    expect(ratingStars(0.5, { allowHalf: true })).toEqual({
      value: 0.5,
      stars: ["half", "empty", "empty", "empty", "empty"],
    });
  });

  it("leaves x.5 unsplit without allowHalf", () => {
    expect(ratingStars(2.5).stars).toEqual([
      "filled",
      "filled",
      "empty",
      "empty",
      "empty",
    ]);
  });

  it("renders `max` stars for a max other than 5", () => {
    const { stars } = ratingStars(7, { max: 10, allowHalf: true });
    expect(stars).toHaveLength(10);
    expect(stars.filter((kind) => kind === "filled")).toHaveLength(7);
    expect(stars.filter((kind) => kind === "empty")).toHaveLength(3);
  });

  it("coerces a numeric string, as the fields do", () => {
    expect(ratingStars("4")).toEqual({
      value: 4,
      stars: ["filled", "filled", "filled", "filled", "empty"],
    });
  });

  it("renders no star for a max of 0", () => {
    expect(ratingStars(3, { max: 0 })).toEqual({ value: 3, stars: [] });
  });
});

describe("emailFieldHref", () => {
  it("prefixes the value with mailto:", () => {
    expect(emailFieldHref("ada@example.com")).toBe("mailto:ada@example.com");
  });

  it("is null for a nullish or empty value", () => {
    expect(emailFieldHref(null)).toBeNull();
    expect(emailFieldHref(undefined)).toBeNull();
    expect(emailFieldHref("")).toBeNull();
  });

  it("keeps a stored javascript: url inside the mailto: scheme", () => {
    const href = emailFieldHref("javascript:alert(1)");
    expect(href).not.toBeNull();
    expect(href?.startsWith("mailto:")).toBe(true);
  });
});

describe("defaultRecordRepresentation", () => {
  it("walks name then title then label then reference", () => {
    expect(defaultRecordRepresentation({ id: 1, name: "N", title: "T" })).toBe(
      "N",
    );
    expect(defaultRecordRepresentation({ id: 1, title: "T", label: "L" })).toBe(
      "T",
    );
    expect(
      defaultRecordRepresentation({ id: 1, label: "L", reference: "R" }),
    ).toBe("L");
    expect(defaultRecordRepresentation({ id: 1, reference: "R" })).toBe("R");
  });

  it("skips an empty-string field", () => {
    expect(defaultRecordRepresentation({ id: 2, name: "", title: "T" })).toBe(
      "T",
    );
  });

  it("falls back to #id for a record with only id", () => {
    expect(defaultRecordRepresentation({ id: 5 })).toBe("#5");
    expect(defaultRecordRepresentation({ id: "abc" })).toBe("#abc");
  });

  it("keeps a numeric field as a number", () => {
    expect(defaultRecordRepresentation({ id: 1, name: 42 })).toBe(42);
  });
});
