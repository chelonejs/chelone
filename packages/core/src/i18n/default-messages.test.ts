import { describe, expect, it } from "vitest";
import { defaultMessages } from "./default-messages";
import { createI18n } from "./i18n";

describe("defaultMessages", () => {
  it("covers every i18n key the core controllers emit", () => {
    const emittedKeys = [
      "chelone.message.invalid_form",
      "chelone.message.select_all_limit_reached",
      "chelone.notification.created",
      "chelone.notification.deleted",
      "chelone.notification.http_error",
      "chelone.notification.item_doesnt_exist",
      "chelone.notification.updated",
    ];
    for (const key of emittedKeys) {
      expect(defaultMessages, `missing key: ${key}`).toHaveProperty([key]);
    }
  });

  it("plugs into createI18n as a working catalog", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: defaultMessages },
    });
    expect(i18n.translate("chelone.message.invalid_form")).toMatch(/not valid/);
    expect(
      i18n.translate("chelone.message.select_all_limit_reached", { max: 50 }),
    ).toContain("50");
  });
});
