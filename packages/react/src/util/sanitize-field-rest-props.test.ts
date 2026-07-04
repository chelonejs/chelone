/**
 * `sanitizeFieldRestProps(props)` — strip the ra-specific field-controller props
 * so the remaining `rest` can be spread onto a DOM element. Parity with
 * ra-core's `sanitizeFieldRestProps` (the `controller/field` one).
 *
 * The excluded-key list must match ra-core exactly; every other prop passes
 * through untouched.
 */

import { describe, expect, it } from "vitest";
import { sanitizeFieldRestProps } from "./sanitize-field-rest-props";

const EXCLUDED = [
  "cellClassName",
  "className",
  "emptyText",
  "fullWidth",
  "headerClassName",
  "label",
  "linkType",
  "link",
  "locale",
  "record",
  "refetch",
  "resource",
  "sortable",
  "sortBy",
  "sortByOrder",
  "source",
  "textAlign",
  "translateChoice",
] as const;

describe("sanitizeFieldRestProps", () => {
  it("strips every ra-specific field prop", () => {
    const input = Object.fromEntries(EXCLUDED.map((k) => [k, "x"]));
    expect(sanitizeFieldRestProps(input)).toEqual({});
  });

  it("passes through non-ra props untouched", () => {
    const rest = sanitizeFieldRestProps({
      id: "field-1",
      "data-testid": "t",
      onClick: undefined,
      title: "hi",
    });
    expect(rest).toEqual({
      id: "field-1",
      "data-testid": "t",
      onClick: undefined,
      title: "hi",
    });
  });

  it("keeps DOM props while stripping ra props from a mixed object", () => {
    const rest = sanitizeFieldRestProps({
      source: "title",
      record: { id: 1 },
      className: "c",
      id: "keep-me",
      role: "cell",
    });
    expect(rest).toEqual({ id: "keep-me", role: "cell" });
  });

  it("does not mutate the input object", () => {
    const input = { source: "title", id: "x" };
    sanitizeFieldRestProps(input);
    expect(input).toEqual({ source: "title", id: "x" });
  });
});
