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
    expect(humanizeField("author name")).toBe("Author name");
  });
});

describe("pluralize (resource-name inflection)", () => {
  it("singularizes at 1, pluralizes otherwise, is idempotent on plurals and handles the irregular set", () => {
    expect(pluralize("posts", 1)).toBe("post");
    expect(pluralize("post", 1)).toBe("post");
    expect(pluralize("post", 2)).toBe("posts");
    expect(pluralize("posts", 2)).toBe("posts");
    expect(pluralize("comment", 0)).toBe("comments");
    expect(pluralize("box", 2)).toBe("boxes");
    expect(pluralize("category", 2)).toBe("categories");
    expect(pluralize("categories", 1)).toBe("category");
    expect(pluralize("person", 2)).toBe("people");
    expect(pluralize("people", 1)).toBe("person");
  });

  it("pluralize with no count pluralizes", () => {
    expect(pluralize("post")).toBe("posts");
    expect(pluralize("person")).toBe("people");
  });
});
