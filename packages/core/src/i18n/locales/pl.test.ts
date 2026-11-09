import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { plMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";

describe("plMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, plMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Polish", () => {
    const i18n = createI18n({
      locale: "pl",
      messages: { en: englishMessages, pl: plMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("Zapisz");
    expect(i18n.translate("chelone.page.create", { name: "post" })).toBe(
      "Utwórz post",
    );
  });

  it("picks Polish's one, few and many plural forms by count", () => {
    const i18n = createI18n({
      locale: "pl",
      messages: { en: englishMessages, pl: plMessages },
    });
    const selected = (count: number) =>
      i18n.translate("chelone.action.bulk_actions", { count });
    expect(selected(1)).toBe("Zaznaczono 1 element");
    expect(selected(3)).toBe("Zaznaczono 3 elementy");
    expect(selected(5)).toBe("Zaznaczono 5 elementów");
    expect(selected(22)).toBe("Zaznaczono 22 elementy");
    expect(selected(12)).toBe("Zaznaczono 12 elementów");
  });
});
