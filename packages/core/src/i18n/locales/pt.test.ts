import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { ptMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { type AnyCheloneI18n, createI18n } from "../i18n";
import type { MessageCatalog } from "../messages";

describe("ptMessages", () => {
  // Erased: inferring the literal union of both catalogs costs core about
  // 12,000 type instantiations, and `pt.ts` already checks the keys.
  const i18n: AnyCheloneI18n = createI18n<MessageCatalog>({
    locale: "pt",
    messages: { en: englishMessages, pt: ptMessages },
  });

  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, ptMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Portuguese", () => {
    expect(i18n.translate("chelone.action.save")).toBe("Salvar");
    expect(i18n.translate("chelone.page.create", { name: "Post" })).toBe(
      "Criar Post",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 item selecionado",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 3 })).toBe(
      "3 itens selecionados",
    );
  });

  it("reads a count of 0 as singular, as Brazilian Portuguese does", () => {
    expect(i18n.translate("chelone.action.bulk_actions", { count: 0 })).toBe(
      "0 item selecionado",
    );
  });
});
