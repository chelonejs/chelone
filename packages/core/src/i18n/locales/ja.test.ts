import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { jaMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n, type I18nProvider } from "../i18n";
import type { MessageCatalog } from "../messages";

describe("jaMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, jaMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Japanese", () => {
    // Widened so createI18n infers no per-key types: the typed catalog costs
    // core about 12,000 instantiations here, and `satisfies` in ja.ts already
    // checks its keys.
    const ja: MessageCatalog = jaMessages;
    const i18n: I18nProvider = createI18n({ locale: "ja", messages: { ja } });
    expect(i18n.translate("chelone.action.save")).toBe("保存");
    expect(i18n.translate("chelone.page.create", { name: "投稿" })).toBe(
      "投稿を作成",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 件を選択中",
    );
  });
});
