/**
 * `sanitizeInputRestProps(props)` — strip the ra-specific input-controller props
 * so the remaining `rest` can be spread onto a DOM element. Parity with
 * ra-core's `sanitizeInputRestProps` (and the shadmin local fork, whose
 * excluded-key list is identical).
 */

import { describe, expect, it } from "vitest";
import { sanitizeInputRestProps } from "./sanitize-input-rest-props";

const EXCLUDED = [
  "afterSubmit",
  "allowNull",
  "alwaysOn",
  "beforeSubmit",
  "component",
  "data",
  "defaultValue",
  "error",
  "format",
  "formatOnBlur",
  "initializeForm",
  "input",
  "isEqual",
  "isRequired",
  "label",
  "limitChoicesToValue",
  "locale",
  "meta",
  "multiple",
  "name",
  "options",
  "optionText",
  "optionValue",
  "parse",
  "record",
  "ref",
  "refetch",
  "render",
  "resource",
  "setFilter",
  "setPagination",
  "setSort",
  "shouldUnregister",
  "source",
  "submitError",
  "subscription",
  "textAlign",
  "translate",
  "translateChoice",
  "validate",
  "validateFields",
  "value",
] as const;

describe("sanitizeInputRestProps", () => {
  it("strips every ra-specific input prop", () => {
    const input = Object.fromEntries(EXCLUDED.map((k) => [k, "x"]));
    expect(sanitizeInputRestProps(input)).toEqual({});
  });

  it("passes through non-ra props untouched", () => {
    const rest = sanitizeInputRestProps({
      id: "input-1",
      placeholder: "type…",
      "data-testid": "t",
    });
    expect(rest).toEqual({
      id: "input-1",
      placeholder: "type…",
      "data-testid": "t",
    });
  });

  it("keeps DOM props while stripping ra props from a mixed object", () => {
    const rest = sanitizeInputRestProps({
      source: "title",
      validate: () => undefined,
      defaultValue: "d",
      id: "keep-me",
      placeholder: "p",
    });
    expect(rest).toEqual({ id: "keep-me", placeholder: "p" });
  });

  it("does not mutate the input object", () => {
    const input = { source: "title", id: "x" };
    sanitizeInputRestProps(input);
    expect(input).toEqual({ source: "title", id: "x" });
  });
});
