import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { deMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";
import type { MessageCatalog } from "../messages";

describe("deMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, deMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in German, with its plural forms", () => {
    // `MessageCatalog` skips typing each key's params from the literal
    // catalogs, which costs core about 12,000 type instantiations per locale.
    // The text is what this test checks.
    const i18n = createI18n<MessageCatalog>({
      locale: "de",
      messages: { en: englishMessages, de: deMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("Speichern");
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 Element ausgewählt",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 3 })).toBe(
      "3 Elemente ausgewählt",
    );
  });
});
