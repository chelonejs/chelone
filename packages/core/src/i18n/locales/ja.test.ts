import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { jaMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";

describe("jaMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, jaMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Japanese", () => {
    const i18n = createI18n({
      locale: "ja",
      messages: { en: englishMessages, ja: jaMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("保存");
    expect(i18n.translate("chelone.page.create", { name: "投稿" })).toBe(
      "投稿を作成",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "1 件を選択中",
    );
  });
});
