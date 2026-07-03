import { describe, expect, it } from "vitest";
import { defaultMessages } from "./default-messages";
import { createI18n } from "./i18n";

describe("defaultMessages", () => {
  it("covers every i18n key the core controllers emit", () => {
    const emittedKeys = [
      "chelone.message.invalid_form",
      "chelone.message.select_all_limit_reached",
      "chelone.message.unsaved_changes",
      "chelone.notification.created",
      "chelone.notification.deleted",
      "chelone.notification.http_error",
      "chelone.notification.item_doesnt_exist",
      "chelone.notification.updated",
      "chelone.validation.email",
      "chelone.validation.maxLength",
      "chelone.validation.maxValue",
      "chelone.validation.minLength",
      "chelone.validation.minValue",
      "chelone.validation.number",
      "chelone.validation.oneOf",
      "chelone.validation.regex",
      "chelone.validation.required",
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
