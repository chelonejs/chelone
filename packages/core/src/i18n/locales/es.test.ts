import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { esMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";

describe("esMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, esMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Spanish, with one and other plurals", () => {
    const i18n = createI18n({
      locale: "es",
      messages: { en: englishMessages, es: esMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("Guardar");
    expect(i18n.translate("chelone.page.create", { name: "publicación" })).toBe(
      "Crear publicación",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 elemento seleccionado",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 3 })).toBe(
      "3 elementos seleccionados",
    );
  });
});
