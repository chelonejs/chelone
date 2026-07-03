/**
 * P7a-T2: clean-room `humanize` / `humanizeField` / `pluralize` helpers.
 *
 * These reimplement the SUBSET of `inflection` the ra-core label helpers rely
 * on (chelone carries no `inflection` dependency):
 * - `humanize(resource)` — underscore→space, strip a trailing `_id`, capitalize
 *   the first letter (ra-core `humanize`).
 * - `humanizeField(source)` — camelCase-aware (`underscore` then `humanize`,
 *   ra-core `transform(['underscore','humanize'])`), so `firstName` → `First
 *   name`.
 * - `pluralize(word, count)` — regular English pluralization plus a small
 *   irregular set (ra-core `inflect`). Full parity with `inflection`'s complete
 *   irregular table is a documented non-goal.
 */

import { describe, expect, it } from "vitest";
import { humanize, humanizeField, pluralize } from "./inflection";

describe("humanize (resource-name default label)", () => {
  it("underscore → space and capitalizes the first letter", () => {
    expect(humanize("user_profile")).toBe("User profile");
    expect(humanize("book_authors")).toBe("Book authors");
  });

  it("capitalizes an already-single lowercase word", () => {
    expect(humanize("posts")).toBe("Posts");
  });

  it("strips a trailing `_id`", () => {
    expect(humanize("author_id")).toBe("Author");
  });

  it("does NOT split camelCase (matches ra-core humanize)", () => {
    // ra-core: humanize('authorName') === 'Authorname'
    expect(humanize("authorName")).toBe("Authorname");
  });
});

describe("humanizeField (field-source default label, camelCase-aware)", () => {
  it("splits camelCase then humanizes", () => {
    expect(humanizeField("firstName")).toBe("First name");
  });

  it("underscore → space then humanizes", () => {
    expect(humanizeField("full_name")).toBe("Full name");
  });

  it("space-separated (from dotted source) humanizes", () => {
    // useTranslateLabel passes source.replace(/\./g,' ') → "author name"
    expect(humanizeField("author name")).toBe("Author name");
  });
});

describe("pluralize (resource-name inflection)", () => {
  it("returns the singular for count === 1", () => {
    expect(pluralize("posts", 1)).toBe("post");
    expect(pluralize("post", 1)).toBe("post");
  });

  it("returns the plural for count !== 1", () => {
    expect(pluralize("post", 2)).toBe("posts");
    expect(pluralize("posts", 2)).toBe("posts");
    expect(pluralize("comment", 2)).toBe("comments");
  });

  it("handles the +es sibilant rule", () => {
    expect(pluralize("box", 2)).toBe("boxes");
  });

  it("handles the y → ies rule", () => {
    expect(pluralize("category", 2)).toBe("categories");
    expect(pluralize("categories", 1)).toBe("category");
  });

  it("covers a small irregular set", () => {
    expect(pluralize("person", 2)).toBe("people");
    expect(pluralize("people", 1)).toBe("person");
  });
});
