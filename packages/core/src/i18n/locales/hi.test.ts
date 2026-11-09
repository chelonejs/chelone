import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { hiMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";

describe("hiMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, hiMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Hindi", () => {
    const i18n = createI18n({
      locale: "hi",
      messages: { en: englishMessages, hi: hiMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("सहेजें");
    expect(i18n.translate("chelone.page.create", { name: "पोस्ट" })).toBe(
      "पोस्ट बनाएँ",
    );
  });

  it("names the count in both of Hindi's plural forms", () => {
    const i18n = createI18n({
      locale: "hi",
      messages: { en: englishMessages, hi: hiMessages },
    });
    // Hindi's `one` covers 0 as well as 1, so its text cannot say "1".
    expect(i18n.translate("chelone.action.bulk_actions", { count: 0 })).toBe(
      "0 आइटम चुना गया",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 आइटम चुना गया",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 5 })).toBe(
      "5 आइटम चुने गए",
    );
  });
});
