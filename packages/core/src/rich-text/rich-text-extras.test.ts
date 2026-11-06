import { describe, expect, it } from "vitest";
import { richTextSanitizeOptions, richTextToolbarItems } from "./rich-text";
import {
  checkRichTextImageFile,
  clampRichTextImageWidth,
  defaultRichTextImageRules,
  normalizeRichTextUpload,
  richTextCodeBlockOptions,
  richTextColors,
  richTextExtraToolbarItems,
  richTextImageActions,
  richTextImageFileName,
  richTextStyledSanitizeOptions,
  sanitizeRichTextStyle,
} from "./rich-text-extras";

const MB = 1024 * 1024;

describe("defaultRichTextImageRules", () => {
  it("allows any image, up to 5 MB, as base64", () => {
    expect(defaultRichTextImageRules).toEqual({
      allowedMimeTypes: ["image/*"],
      maxFileSize: 5 * MB,
      allowBase64: true,
    });
  });
});

describe("checkRichTextImageFile", () => {
  it("passes an image under the size limit", () => {
    expect(
      checkRichTextImageFile(
        { type: "image/png", size: MB },
        defaultRichTextImageRules,
      ),
    ).toBeNull();
    expect(
      checkRichTextImageFile(
        { type: "image/webp", size: 5 * MB },
        defaultRichTextImageRules,
      ),
    ).toBeNull();
  });

  it("rejects a wrong type, an svg and a file over the limit", () => {
    expect(
      checkRichTextImageFile(
        { type: "application/pdf", size: 10 },
        defaultRichTextImageRules,
      ),
    ).toBe("type");
    expect(
      checkRichTextImageFile(
        { type: "image/svg+xml", size: 10 },
        defaultRichTextImageRules,
      ),
    ).toBe("type");
    expect(
      checkRichTextImageFile(
        { type: "image/svg+xml", size: 10 },
        { ...defaultRichTextImageRules, allowedMimeTypes: ["image/svg+xml"] },
      ),
    ).toBe("type");
    expect(
      checkRichTextImageFile(
        { type: "image/png", size: 5 * MB + 1 },
        defaultRichTextImageRules,
      ),
    ).toBe("size");
    expect(
      checkRichTextImageFile({ type: "", size: 10 }, defaultRichTextImageRules),
    ).toBe("type");
  });

  it("matches an exact type and a wildcard subtype", () => {
    const rules = {
      ...defaultRichTextImageRules,
      allowedMimeTypes: ["image/png", "text/*"],
    };
    expect(checkRichTextImageFile({ type: "image/png", size: 1 }, rules)).toBe(
      null,
    );
    expect(checkRichTextImageFile({ type: "IMAGE/PNG", size: 1 }, rules)).toBe(
      null,
    );
    expect(checkRichTextImageFile({ type: "text/plain", size: 1 }, rules)).toBe(
      null,
    );
    expect(checkRichTextImageFile({ type: "image/gif", size: 1 }, rules)).toBe(
      "type",
    );
  });
});

describe("normalizeRichTextUpload", () => {
  it("takes a string or an id and src", () => {
    expect(normalizeRichTextUpload("https://cdn.test/a.png")).toEqual({
      id: null,
      src: "https://cdn.test/a.png",
    });
    expect(
      normalizeRichTextUpload({ id: 7, src: "https://cdn.test/a.png" }),
    ).toEqual({ id: "7", src: "https://cdn.test/a.png" });
    expect(
      normalizeRichTextUpload({ id: "abc", src: "data:image/png;base64,AAAA" }),
    ).toEqual({ id: "abc", src: "data:image/png;base64,AAAA" });
  });

  it("returns null for a javascript, svg data or vbscript source", () => {
    for (const src of [
      "javascript:alert(1)",
      " java\tscript:alert(1)",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "vbscript:msgbox(1)",
    ]) {
      expect(normalizeRichTextUpload(src), src).toBeNull();
      expect(normalizeRichTextUpload({ id: 1, src }), src).toBeNull();
    }
  });
});

describe("clampRichTextImageWidth", () => {
  it("rounds and clamps, with max winning over min", () => {
    const range = { min: 100, max: 800 };
    expect(clampRichTextImageWidth(300.6, range)).toBe(301);
    expect(clampRichTextImageWidth(10, range)).toBe(100);
    expect(clampRichTextImageWidth(5000, range)).toBe(800);
    expect(clampRichTextImageWidth(99.6, range)).toBe(100);
    expect(clampRichTextImageWidth(300, { min: 500, max: 200 })).toBe(200);
    expect(clampRichTextImageWidth(Number.NaN, range)).toBe(100);
  });
});

describe("richTextImageFileName", () => {
  it("names a download from the alt text and the mime type", () => {
    expect(richTextImageFileName("Team photo", "image/png")).toBe(
      "Team photo.png",
    );
    expect(richTextImageFileName("a", "image/jpeg")).toBe("a.jpg");
    expect(richTextImageFileName("a", "image/svg+xml")).toBe("a.svg");
    expect(richTextImageFileName("", "image/webp")).toBe("image.webp");
    expect(richTextImageFileName("   ", "image/gif")).toBe("image.gif");
  });

  it("strips path separators, control characters and leading dots", () => {
    const traversal = richTextImageFileName("../../etc/passwd", "image/png");
    expect(traversal).toBe("etcpasswd.png");

    const markup = richTextImageFileName(
      "<img src=x onerror=alert(1)>",
      "image/png",
    );
    expect(markup).not.toMatch(/[/\\]/);
    expect(markup).toBe("<img src=x onerror=alert(1)>.png");

    expect(richTextImageFileName("a\u0000b\nc\\d/e", "image/png")).toBe(
      "abcde.png",
    );
    expect(richTextImageFileName("...", "image/png")).toBe("image.png");
    expect(richTextImageFileName("../", "image/png")).toBe("image.png");
  });
});

describe("richTextImageActions", () => {
  it("lists view, download, copyImage, copyLink and remove with label keys", () => {
    expect(richTextImageActions.map((action) => action.id)).toEqual([
      "view",
      "download",
      "copyImage",
      "copyLink",
      "remove",
    ]);
    for (const action of richTextImageActions) {
      expect(action.labelKey).toBe(`chelone.rich_text.image.${action.id}`);
      expect(action.defaultLabel).not.toBe("");
    }
  });
});

describe("richTextColors", () => {
  it("every color has a unique id and a chelone.rich_text.color label key", () => {
    const ids = richTextColors.map((color) => color.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const color of richTextColors) {
      expect(color.labelKey).toBe(`chelone.rich_text.color.${color.id}`);
      expect(color.defaultLabel).not.toBe("");
    }
  });

  it("has three palettes of seven, plus a default that clears the color", () => {
    const palettes = new Map<string, number>();
    for (const color of richTextColors) {
      if (color.id === "default") continue;
      palettes.set(color.palette, (palettes.get(color.palette) ?? 0) + 1);
      expect(color.value).toBe(`var(--rich-text-color-${color.id})`);
    }
    expect([...palettes.values()]).toEqual([7, 7, 7]);
    const fallback = richTextColors.find((color) => color.id === "default");
    expect(fallback?.value).toBeNull();
  });
});

describe("sanitizeRichTextStyle", () => {
  it("keeps a palette, hex, rgb or hsl color", () => {
    const palette = richTextColors.find((color) => color.id !== "default");
    expect(palette?.value).toBeTruthy();
    expect(sanitizeRichTextStyle(`color: ${palette?.value}`)).toBe(
      `color: ${palette?.value}`,
    );
    for (const value of [
      "#fff",
      "#FF00aa",
      "#ff00aa80",
      "rgb(255, 0, 10)",
      "rgba(255,0,10,0.5)",
      "rgb(255 0 10 / 50%)",
      "hsl(120, 50%, 40%)",
      "hsla(120, 50%, 40%, .5)",
    ]) {
      expect(sanitizeRichTextStyle(`color: ${value}`), value).toBe(
        `color: ${value}`,
      );
    }
    expect(sanitizeRichTextStyle("  COLOR :#fff ;")).toBe("color: #fff");
  });

  it("returns null for any other declaration or value", () => {
    for (const style of [
      "position: fixed",
      "color: red; position: fixed",
      "background: url(javascript:alert(1))",
      "color: expression(alert(1))",
      "color: var(--x, url(x))",
      "color: red",
      "color: var(--rich-text-color-nope)",
      "color: #ggg",
      "color: #ffff0",
      "color: rgb(url(x), 0, 0)",
      "color: rgb(1, 2)",
      "color: #fff !important",
      "color: #fff; color: #000",
      "background-color: #fff",
      "color",
      "",
    ]) {
      expect(sanitizeRichTextStyle(style), style).toBeNull();
    }
  });
});

describe("richTextStyledSanitizeOptions", () => {
  it("is richTextSanitizeOptions without style in FORBID_ATTR", () => {
    expect(richTextStyledSanitizeOptions.FORBID_TAGS).toEqual(
      richTextSanitizeOptions.FORBID_TAGS,
    );
    expect(richTextStyledSanitizeOptions.FORBID_ATTR).not.toContain("style");
    expect(richTextSanitizeOptions.FORBID_ATTR).toContain("style");
  });
});

describe("richTextCodeBlockOptions", () => {
  it("is a frozen plain object of shadmin's settings", () => {
    expect(richTextCodeBlockOptions).toEqual({
      languageClassPrefix: "language-",
      defaultLanguage: null,
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      enableTabIndentation: false,
      tabSize: 4,
    });
    expect(Object.isFrozen(richTextCodeBlockOptions)).toBe(true);
  });
});

describe("richTextExtraToolbarItems", () => {
  it("lists image and color shaped like richTextToolbarItems", () => {
    expect(richTextExtraToolbarItems.map((entry) => entry.id)).toEqual([
      "image",
      "color",
    ]);
    const reference = richTextToolbarItems[0];
    for (const entry of richTextExtraToolbarItems) {
      expect(entry.labelKey).toBe(`chelone.rich_text.${entry.id}`);
      expect(entry.defaultLabel).not.toBe("");
      expect(Object.keys(entry)).toEqual(
        expect.arrayContaining(["id", "group", "labelKey", "defaultLabel"]),
      );
      expect(Object.isFrozen(entry)).toBe(true);
    }
    expect(reference && Object.isFrozen(reference)).toBe(true);
  });
});
