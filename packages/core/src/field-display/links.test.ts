import { describe, expect, it } from "vitest";
import { fileFieldLinks, imageFieldSources, urlFieldHref } from "./links";

describe("urlFieldHref", () => {
  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    '<iframe src="javascript:alert(1)"></iframe>',
  ])("rejects %j", (value) => {
    expect(urlFieldHref(value)).toBeUndefined();
  });

  it.each([
    "https://example.com/a",
    "HTTP://example.com",
    "mailto:me@example.com",
    "tel:+123456",
    "/path",
    "#anchor",
  ])("keeps %j", (value) => {
    expect(urlFieldHref(value)).toBe(value);
  });

  it("rejects a schemeless value, which renders as text", () => {
    expect(urlFieldHref("example.com")).toBeUndefined();
  });
});

describe("fileFieldLinks", () => {
  it("is null for a nullish value or an empty array", () => {
    expect(fileFieldLinks(null, {}, {})).toBeNull();
    expect(fileFieldLinks(undefined, {}, {})).toBeNull();
    expect(fileFieldLinks([], {}, {})).toBeNull();
  });

  it("reads a single file's title off the record, or falls back to the literal", () => {
    const record = { url: "doc.pdf", name: "Presentation" };
    expect(fileFieldLinks("doc.pdf", record, { title: "name" })).toEqual([
      { href: "doc.pdf", title: "Presentation" },
    ]);
    expect(fileFieldLinks("doc.pdf", record, { title: "Download" })).toEqual([
      { href: "doc.pdf", title: "Download" },
    ]);
    expect(fileFieldLinks("doc.pdf", record, {})).toEqual([
      { href: "doc.pdf", title: undefined },
    ]);
  });

  it("reads each array item's src and title, falling back to the title literal", () => {
    const files = [
      { path: "a.pdf", label: "A" },
      { path: "b.pdf" },
      { label: "C" },
    ];
    expect(fileFieldLinks(files, {}, { src: "path", title: "label" })).toEqual([
      { href: "a.pdf", title: "A" },
      { href: "b.pdf", title: "label" },
      { href: "label", title: "C" },
    ]);
  });

  it("gives a link no href when src and title both miss", () => {
    expect(fileFieldLinks([{ id: 1 }], {}, { src: "path" })).toEqual([
      { href: undefined, title: undefined },
    ]);
  });

  it("drops an unsafe href and keeps the link", () => {
    expect(fileFieldLinks("javascript:alert(1)", {}, { title: "x" })).toEqual([
      { href: undefined, title: "x" },
    ]);
    expect(
      fileFieldLinks([{ u: "JavaScript:alert(1)" }], {}, { src: "u" }),
    ).toEqual([{ href: undefined, title: undefined }]);
  });

  it("keeps a blob url", () => {
    expect(fileFieldLinks("blob:http://x/1", {}, {})).toEqual([
      { href: "blob:http://x/1", title: undefined },
    ]);
  });
});

describe("imageFieldSources", () => {
  it("is null for a nullish value or an empty array", () => {
    expect(imageFieldSources(null, {}, {})).toBeNull();
    expect(imageFieldSources([], {}, {})).toBeNull();
  });

  it("reads a single image and each array item", () => {
    expect(imageFieldSources("/a.png", { alt: "A" }, { title: "alt" })).toEqual(
      [{ src: "/a.png", title: "A" }],
    );
    expect(
      imageFieldSources([{ u: "https://x/b.png" }], {}, { src: "u" }),
    ).toEqual([{ src: "https://x/b.png", title: undefined }]);
  });

  it("rejects an unsafe src", () => {
    expect(imageFieldSources("javascript:alert(1)", {}, {})).toEqual([
      { src: undefined, title: undefined },
    ]);
  });

  it("keeps a raster data image and rejects an SVG one", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    expect(imageFieldSources(png, {}, {})).toEqual([
      { src: png, title: undefined },
    ]);
    expect(
      imageFieldSources("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", {}, {}),
    ).toEqual([{ src: undefined, title: undefined }]);
  });
});
