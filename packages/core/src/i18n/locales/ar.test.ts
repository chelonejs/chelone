import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { arMessages } from "../../index";
import { getLocaleDirection } from "../direction";
import { englishMessages } from "../english-messages";
import { type AnyCheloneI18n, createI18n } from "../i18n";
import type { MessageCatalog } from "../messages";

// The checks here are runtime text: an erased catalog spares the compiler the
// typed union of two 440-key catalogs, which put core over its type cost budget.
const i18n: AnyCheloneI18n = createI18n<MessageCatalog>({
  locale: "ar",
  messages: { en: englishMessages, ar: arMessages },
});

describe("arMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, arMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Arabic", () => {
    expect(i18n.translate("chelone.action.save")).toBe("حفظ");
    expect(i18n.translate("chelone.page.create", { name: "مقالة" })).toBe(
      "إنشاء مقالة",
    );
  });

  it("picks each of Arabic's six plural forms", () => {
    const selected = (count: number) =>
      i18n.translate("chelone.action.bulk_actions", { count });
    expect(selected(0)).toBe("لم يُحدَّد أي عنصر");
    expect(selected(1)).toBe("تم تحديد عنصر واحد");
    expect(selected(2)).toBe("تم تحديد عنصرين");
    expect(selected(3)).toBe("تم تحديد 3 عناصر");
    expect(selected(11)).toBe("تم تحديد 11 عنصرًا");
    expect(selected(100)).toBe("تم تحديد 100 عنصر");
  });

  it("is a right-to-left locale", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
  });
});
