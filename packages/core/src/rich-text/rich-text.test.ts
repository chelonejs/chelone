import { describe, expect, it } from "vitest";
import { matchesHotkey } from "../command-menu/hotkey";
import {
  isSafeImageSrc,
  isSafeLinkUrl,
  richTextBlockTypes,
  richTextSanitizeOptions,
  richTextStarterKitOptions,
  richTextToolbarItems,
} from "./rich-text";

describe("isSafeLinkUrl", () => {
  it("allows http, https, mailto, tel and scheme-less URLs", () => {
    for (const url of [
      "http://example.com",
      "https://example.com/a?b=c#d",
      "HTTPS://EXAMPLE.COM",
      "mailto:a@example.com",
      "tel:+123456789",
      "/a",
      "#a",
      "?a",
      "a/b",
      "//host/a",
      "",
    ]) {
      expect(isSafeLinkUrl(url), url).toBe(true);
    }
  });

  it("rejects javascript, vbscript, data and file URLs in any case", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "vbscript:msgbox(1)",
      "VBScript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "DATA:text/html;base64,AAAA",
      "file:///etc/passwd",
      "FILE:///etc/passwd",
      "ftp://example.com",
    ]) {
      expect(isSafeLinkUrl(url), url).toBe(false);
    }
  });

  it("rejects a javascript URL split by tabs, newlines or leading spaces", () => {
    for (const url of [
      " java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "java\r\nscript:alert(1)",
      "\u0000javascript:alert(1)",
      "\u001fjavascript:alert(1)",
      "  javascript:alert(1)",
    ]) {
      expect(isSafeLinkUrl(url), JSON.stringify(url)).toBe(false);
    }
  });
});

describe("isSafeImageSrc", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";

  it("allows http, https, blob and scheme-less sources", () => {
    for (const src of [
      "http://example.com/a.png",
      "https://example.com/a.png",
      "HTTPS://example.com/a.png",
      "blob:https://example.com/0b1c",
      "/a.png",
      "a/b.png",
      "//cdn.example.com/a.png",
    ]) {
      expect(isSafeImageSrc(src), src).toBe(true);
    }
  });

  it("rejects mailto, tel and file sources", () => {
    for (const src of ["mailto:a@example.com", "tel:+123", "file:///a.png"]) {
      expect(isSafeImageSrc(src), src).toBe(false);
    }
  });

  it("allows a base64 raster data URL only with allowDataImages", () => {
    expect(isSafeImageSrc(png)).toBe(false);
    expect(isSafeImageSrc(png, { allowDataImages: false })).toBe(false);
    for (const type of ["png", "jpeg", "gif", "webp", "avif"]) {
      const src = `data:image/${type};base64,AAAA`;
      expect(isSafeImageSrc(src, { allowDataImages: true }), src).toBe(true);
    }
    expect(
      isSafeImageSrc(" DATA:IMAGE/PNG;BASE64,AAAA", { allowDataImages: true }),
    ).toBe(true);
  });

  it("rejects an svg data URL and a javascript URL even with allowDataImages", () => {
    const options = { allowDataImages: true };
    for (const src of [
      "data:image/svg+xml;base64,AAAA",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "data:image/png,AAAA",
      "data:text/html;base64,AAAA",
      "javascript:alert(1)",
      "java\tscript:alert(1)",
    ]) {
      expect(isSafeImageSrc(src, options), src).toBe(false);
    }
  });
});

describe("richTextStarterKitOptions", () => {
  it("the link option rejects a javascript URL and allows an https URL", () => {
    const { link } = richTextStarterKitOptions;
    expect(link.isAllowedUri("javascript:alert(1)")).toBe(false);
    expect(link.isAllowedUri("java\tscript:alert(1)")).toBe(false);
    expect(link.isAllowedUri("https://example.com")).toBe(true);
  });

  it("opens no link on click, autolinks and defaults to https", () => {
    const { link } = richTextStarterKitOptions;
    expect(link.openOnClick).toBe(false);
    expect(link.autolink).toBe(true);
    expect(link.defaultProtocol).toBe("https");
  });

  it("offers heading levels 1 to 6", () => {
    expect(richTextStarterKitOptions.heading.levels).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe("richTextSanitizeOptions", () => {
  it("forbids style, form controls and frames, and the style attribute", () => {
    expect([...richTextSanitizeOptions.FORBID_TAGS].sort()).toEqual(
      [
        "button",
        "embed",
        "form",
        "iframe",
        "input",
        "object",
        "select",
        "style",
        "textarea",
      ].sort(),
    );
    expect(richTextSanitizeOptions.FORBID_ATTR).toEqual(["style"]);
  });
});

describe("the option objects", () => {
  it("are frozen, nested objects and arrays included", () => {
    expect(Object.isFrozen(richTextSanitizeOptions)).toBe(true);
    expect(Object.isFrozen(richTextSanitizeOptions.FORBID_TAGS)).toBe(true);
    expect(Object.isFrozen(richTextSanitizeOptions.FORBID_ATTR)).toBe(true);
    expect(Object.isFrozen(richTextStarterKitOptions)).toBe(true);
    expect(Object.isFrozen(richTextStarterKitOptions.heading)).toBe(true);
    expect(Object.isFrozen(richTextStarterKitOptions.heading.levels)).toBe(
      true,
    );
    expect(Object.isFrozen(richTextStarterKitOptions.link)).toBe(true);
  });
});

describe("richTextToolbarItems", () => {
  it("lists every toolbar id once, in order, with a chelone.rich_text label key", () => {
    expect(richTextToolbarItems.map((item) => item.id)).toEqual([
      "bold",
      "italic",
      "underline",
      "strike",
      "code",
      "clearFormatting",
      "link",
      "bulletList",
      "orderedList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
      "undo",
      "redo",
    ]);
    for (const item of richTextToolbarItems) {
      expect(item.labelKey).toBe(`chelone.rich_text.${item.id}`);
      expect(item.defaultLabel).not.toBe("");
    }
  });

  it("puts every item in one of the five groups", () => {
    const groups = new Set(richTextToolbarItems.map((item) => item.group));
    expect([...groups].sort()).toEqual(
      ["block", "history", "insert", "list", "mark"].sort(),
    );
  });

  it("every shortcut parses with matchesHotkey", () => {
    const withShortcut = richTextToolbarItems.filter((item) => item.shortcut);
    expect(withShortcut.map((item) => item.id)).toEqual(
      expect.arrayContaining(["bold", "italic", "undo", "redo"]),
    );
    for (const { shortcut } of withShortcut) {
      const parts = (shortcut ?? "").split("+");
      const key = parts.pop() ?? "";
      const event = {
        key,
        metaKey: false,
        ctrlKey: parts.includes("mod"),
        shiftKey: parts.includes("shift"),
        altKey: parts.includes("alt"),
      };
      expect(matchesHotkey(event, shortcut ?? ""), shortcut).toBe(true);
    }
    expect(
      richTextToolbarItems.find((item) => item.id === "bold")?.shortcut,
    ).toBe("mod+b");
  });
});

describe("richTextBlockTypes", () => {
  it("lists paragraph, then heading levels 1 to 6, each with a label", () => {
    expect(richTextBlockTypes.map((block) => block.id)).toEqual([
      "paragraph",
      "heading1",
      "heading2",
      "heading3",
      "heading4",
      "heading5",
      "heading6",
    ]);
    expect(richTextBlockTypes[0]?.defaultLabel).toBe("Paragraph");
    expect(richTextBlockTypes[3]).toMatchObject({
      level: 3,
      labelKey: "chelone.rich_text.heading_3",
      defaultLabel: "Heading 3",
    });
  });
});
