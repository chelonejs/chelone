import { describe, expect, it } from "vitest";
import { getLocaleDirection } from "./direction";

describe("getLocaleDirection", () => {
  it("is rtl for the right-to-left locales", () => {
    for (const locale of ["ar", "he", "fa", "ur", "ckb", "ps", "yi"]) {
      expect(getLocaleDirection(locale)).toBe("rtl");
    }
  });

  it("is ltr for the other locales the apps list", () => {
    for (const locale of ["en", "fr", "de", "es", "ja", "zh", "ru", "pt-BR"]) {
      expect(getLocaleDirection(locale)).toBe("ltr");
    }
  });

  it("is ltr for a language whose default script is Latin", () => {
    // Turkmen and Kurmanji Kurdish: CLDR gives them tk-Latn-TM and ku-Latn-TR.
    // Sorani Kurdish is ckb, which is right to left.
    for (const locale of ["tk", "tk-TM", "ku", "ku-TR"]) {
      expect(getLocaleDirection(locale)).toBe("ltr");
    }
    // Written in Arabic script, the same languages read right to left.
    for (const locale of ["tk-Arab", "ku-Arab"]) {
      expect(getLocaleDirection(locale)).toBe("rtl");
    }
  });

  it("follows a region-qualified right-to-left tag", () => {
    for (const locale of ["ar-EG", "ar-SA", "ar-MA-1994", "fa-AF", "he-IL"]) {
      expect(getLocaleDirection(locale)).toBe("rtl");
    }
  });

  it("accepts the underscore separator a POSIX/ICU tag carries", () => {
    expect(getLocaleDirection("ar_EG")).toBe("rtl");
    expect(getLocaleDirection("fr_FR")).toBe("ltr");
  });

  it("reads a script subtag, which decides over the language", () => {
    // Punjabi is Arabic-script here, Latin-script there.
    expect(getLocaleDirection("pa-Arab")).toBe("rtl");
    expect(getLocaleDirection("pa-Guru")).toBe("ltr");
    // Arabic written in Latin letters (Arabizi) reads left to right.
    expect(getLocaleDirection("ar-Latn")).toBe("ltr");
    expect(getLocaleDirection("zh-Hant")).toBe("ltr");
    expect(getLocaleDirection("sr-Cyrl-RS")).toBe("ltr");
  });

  it("ignores the -u- and -x- extensions", () => {
    // `nu-arab` picks Arabic DIGITS under a Latin-script locale.
    expect(getLocaleDirection("en-US-u-nu-arab")).toBe("ltr");
    expect(getLocaleDirection("ar-u-nu-latn")).toBe("rtl");
    expect(getLocaleDirection("en-x-arab")).toBe("ltr");
  });

  it("is ltr for an empty or unparseable tag", () => {
    for (const locale of ["", "-", "und", "x", "123"]) {
      expect(getLocaleDirection(locale)).toBe("ltr");
    }
  });

  it("is case-insensitive, as BCP 47 tags are", () => {
    expect(getLocaleDirection("AR")).toBe("rtl");
    expect(getLocaleDirection("ar-eg")).toBe("rtl");
    expect(getLocaleDirection("PA-ARAB")).toBe("rtl");
  });
});
