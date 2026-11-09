// @vitest-environment node

import { createI18n } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { readFieldValue, serverEmptyText } from "./read-field-value";

interface Post {
  id: number;
  title: string;
  views: number;
  author: { name: string };
  tags: { label: string }[];
  subtitle: string | null;
  summary?: string;
}

const post: Post = {
  id: 1,
  title: "Hello",
  views: 0,
  author: { name: "Ada" },
  tags: [{ label: "news" }],
  subtitle: null,
};

describe("readFieldValue", () => {
  it("reads a top-level, a nested and a bracket-indexed path", () => {
    expect(readFieldValue(post, "title")).toBe("Hello");
    expect(readFieldValue(post, "author.name")).toBe("Ada");
    expect(readFieldValue(post, "tags[0].label")).toBe("news");
  });

  it("returns defaultValue only for an undefined value", () => {
    expect(readFieldValue(post, "summary", "none")).toBe("none");
    expect(readFieldValue(post, "subtitle", "none")).toBeNull();
    expect(readFieldValue(post, "views", 5)).toBe(0);
  });
});

describe("serverEmptyText", () => {
  it("returns empty as is with no i18n", () => {
    expect(serverEmptyText("app.none")).toBe("app.none");
  });

  it("translates empty with the given i18n", () => {
    const i18n = createI18n({
      locale: "fr",
      messages: { fr: { "app.none": "Aucun" } },
    });
    expect(serverEmptyText("app.none", i18n)).toBe("Aucun");
  });

  it("falls back to empty itself for a key the catalog lacks", () => {
    const i18n = createI18n({ locale: "fr", messages: { fr: {} } });
    expect(serverEmptyText("No value", i18n)).toBe("No value");
  });
});
