import { describe, expect, it } from "vitest";
import { z } from "zod";
import { z as z3 } from "zod/v3";
import {
  type BlockDocNode,
  type BlockSpec,
  createBlockRegistry,
  describeBlockAttrs,
  emptyBlockDocument,
  getBlockDefaultAttrs,
  isEmptyBlockDocument,
  matchBlocks,
  toEmbedSrc,
  unknownBlockType,
  unwrapUnknownBlocks,
  wrapUnknownBlocks,
} from "./block-document";

const block = (
  name: string,
  group: string,
  extra: Partial<BlockSpec> = {},
): BlockSpec => ({
  name,
  label: name,
  group,
  schema: z.object({}),
  ...extra,
});

describe("createBlockRegistry", () => {
  it("lists blocks in order and groups them by first appearance", () => {
    const callout = block("callout", "Text");
    const image = block("image", "Media");
    const quote = block("quote", "Text");
    const registry = createBlockRegistry([callout, image, quote]);

    expect(registry.list()).toEqual([callout, image, quote]);
    expect(registry.names()).toEqual(["callout", "image", "quote"]);
    expect(registry.groups()).toEqual(["Text", "Media"]);
    expect(registry.get("image")).toBe(image);
    expect(registry.get("missing")).toBeUndefined();
  });

  it("throws on a duplicate name", () => {
    expect(() =>
      createBlockRegistry([block("callout", "Text"), block("callout", "Text")]),
    ).toThrow('block-editor: duplicate block name "callout"');
  });

  it("throws on the name of a built-in node", () => {
    for (const name of [
      "doc",
      "text",
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "orderedList",
      "listItem",
      "codeBlock",
      "horizontalRule",
      "hardBreak",
      "unknownBlock",
    ]) {
      expect(() => createBlockRegistry([block(name, "Text")])).toThrow(
        `block-editor: "${name}" is a built-in node`,
      );
    }
  });
});

describe("getBlockDefaultAttrs", () => {
  it("takes each default, and null for a required key", () => {
    const schema = z.object({
      title: z.string(),
      level: z.number().default(2),
      tone: z.enum(["info", "warn"]).default("info"),
    });
    expect(getBlockDefaultAttrs(schema)).toEqual({
      title: null,
      level: 2,
      tone: "info",
    });
  });

  it("throws for a schema that is not an object", () => {
    // @ts-expect-error a string schema is not an attrs object
    expect(() => getBlockDefaultAttrs(z.string())).toThrow(
      "block schema must be a z.object",
    );
  });
});

describe("describeBlockAttrs", () => {
  it("reads an enum as select, a boolean, a number and a string", () => {
    const fields = describeBlockAttrs(
      z.object({
        tone: z.enum(["info", "warn"]),
        open: z.boolean(),
        level: z.number(),
        title: z.string(),
      }),
    );
    expect(fields.map(({ source, kind }) => ({ source, kind }))).toEqual([
      { source: "tone", kind: "select" },
      { source: "open", kind: "boolean" },
      { source: "level", kind: "number" },
      { source: "title", kind: "text" },
    ]);
    expect(fields[0]?.choices).toEqual([
      { id: "info", name: "info" },
      { id: "warn", name: "warn" },
    ]);
  });

  it("describes a Zod 3 object the same way", () => {
    const fields = describeBlockAttrs(
      z3.object({ tone: z3.enum(["info", "warn"]), open: z3.boolean() }),
    );
    expect(fields.map((f) => f.kind)).toEqual(["select", "boolean"]);
  });
});

describe("matchBlocks", () => {
  const blocks = [
    block("callout", "Text", {
      label: "Encadré",
      keywords: ["note", "alerte"],
    }),
    block("video", "Media", { label: "Video", description: "Embed a Vimeo" }),
    block("quote", "Text", { label: "Quote" }),
  ];

  it("matches label, keywords and description, ignoring case and accents", () => {
    expect(matchBlocks(blocks, "ENCADRE").map((b) => b.name)).toEqual([
      "callout",
    ]);
    expect(matchBlocks(blocks, "alert").map((b) => b.name)).toEqual([
      "callout",
    ]);
    expect(matchBlocks(blocks, "vimeo").map((b) => b.name)).toEqual(["video"]);
    expect(matchBlocks(blocks, "zzz")).toEqual([]);
  });

  it("returns every block, in order, for an empty query", () => {
    expect(matchBlocks(blocks, "")).toEqual(blocks);
  });
});

describe("wrapUnknownBlocks", () => {
  const known = new Set(["paragraph", "callout"]);
  const unknownNode: BlockDocNode = { type: "chart", attrs: { n: 1 } };
  const doc: BlockDocNode = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "hi" }] },
      unknownNode,
      {
        type: "callout",
        content: [{ type: "gallery", content: [{ type: "text", text: "x" }] }],
      },
    ],
  };

  it("wraps an unknown node at any depth and leaves known ones", () => {
    expect(wrapUnknownBlocks(doc, known)).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "hi" }] },
        { type: unknownBlockType, attrs: { payload: unknownNode } },
        {
          type: "callout",
          content: [
            {
              type: unknownBlockType,
              attrs: {
                payload: {
                  type: "gallery",
                  content: [{ type: "text", text: "x" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("unwrapping a wrapped document returns an equal document", () => {
    expect(unwrapUnknownBlocks(wrapUnknownBlocks(doc, known))).toEqual(doc);
  });

  it("does not mutate its input", () => {
    const before = structuredClone(doc);
    const wrapped = wrapUnknownBlocks(doc, known);
    expect(doc).toEqual(before);
    const wrappedBefore = structuredClone(wrapped);
    unwrapUnknownBlocks(wrapped);
    expect(wrapped).toEqual(wrappedBefore);
  });
});

describe("emptyBlockDocument", () => {
  it("returns a new document on each call", () => {
    expect(emptyBlockDocument()).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    expect(emptyBlockDocument()).not.toBe(emptyBlockDocument());
  });
});

describe("isEmptyBlockDocument", () => {
  it("is true for null, an empty doc and empty paragraphs, and false for text", () => {
    expect(isEmptyBlockDocument(null)).toBe(true);
    expect(isEmptyBlockDocument(undefined)).toBe(true);
    expect(isEmptyBlockDocument({ type: "doc" })).toBe(true);
    expect(isEmptyBlockDocument({ type: "doc", content: [] })).toBe(true);
    expect(isEmptyBlockDocument(emptyBlockDocument())).toBe(true);
    expect(
      isEmptyBlockDocument({
        type: "doc",
        content: [{ type: "paragraph" }, { type: "paragraph", content: [] }],
      }),
    ).toBe(true);
    expect(
      isEmptyBlockDocument({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "a" }] },
        ],
      }),
    ).toBe(false);
    expect(
      isEmptyBlockDocument({ type: "doc", content: [{ type: "callout" }] }),
    ).toBe(false);
  });
});

describe("toEmbedSrc", () => {
  it("maps YouTube and Vimeo URLs to their embed URLs", () => {
    expect(toEmbedSrc("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(toEmbedSrc("https://youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(toEmbedSrc("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(toEmbedSrc("https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871",
    );
  });

  it("returns null for other hosts, a bad id, and javascript or data URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "https://youtube.com/watch?v=<script>",
      "https://youtube.com/watch?v=short",
      "https://youtu.be/dQw4w9WgXcQextra",
      "https://evil.example/embed",
      "https://evil.example/watch?v=dQw4w9WgXcQ",
      "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://vimeo.com/abc",
      "https://vimeo.com/123abc",
      "ftp://vimeo.com/123",
      "not a url",
      "",
    ]) {
      expect(toEmbedSrc(url), url).toBeNull();
    }
  });
});
