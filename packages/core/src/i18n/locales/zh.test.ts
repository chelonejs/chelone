import { localeCatalogGaps } from "@chelone/test-utils/locale-catalog";
import { describe, expect, it } from "vitest";
import { zhMessages } from "../../index";
import { englishMessages } from "../english-messages";
import { createI18n } from "../i18n";

describe("zhMessages", () => {
  it("has every English key, no other key, and English's placeholders", () => {
    expect(localeCatalogGaps(englishMessages, zhMessages)).toEqual({
      missing: [],
      extra: [],
      placeholders: [],
    });
  });

  it("translates through createI18n in Chinese", () => {
    const i18n = createI18n({
      locale: "zh",
      messages: { en: englishMessages, zh: zhMessages },
    });
    expect(i18n.translate("chelone.action.save")).toBe("保存");
    expect(i18n.translate("chelone.page.create", { name: "文章" })).toBe(
      "创建文章",
    );
    expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
      "已选择 1 项",
    );
  });
});
