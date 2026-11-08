import { describe, expect, it } from "vitest";
import { defaultMessages } from "./default-messages";
import { englishMessages } from "./english-messages";
import { createI18n } from "./i18n";
import type { MessageCatalog } from "./messages";

/** The erased view, so a key read from `Object.entries` is not an index error. */
const english: MessageCatalog = englishMessages;

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

/**
 * The component keys that moved from `ra.*` to `chelone.*` (#1773). Four landed
 * on a controller key that already says something else, so the component's own
 * key keeps the group and names its role instead of overwriting the controller.
 */
const collidedWithControllerKeys = [
  "chelone.message.access_denied",
  "chelone.message.authentication_error",
  "chelone.message.loading",
  "chelone.notification.http_error",
];

const movedBesideThem = [
  "chelone.message.access_denied_detail",
  "chelone.message.authentication_error_detail",
  "chelone.message.loading_detail",
  "chelone.notification.http_error_label",
];

describe("the moved ra.* keys", () => {
  it("keeps no ra.* key in either catalog", () => {
    const keys = [
      ...Object.keys(defaultMessages),
      ...Object.keys(englishMessages),
    ];
    expect(keys.filter((key) => key.startsWith("ra."))).toEqual([]);
  });

  it("holds every controller key at its own text, with no moved key on top of it", () => {
    for (const [key, text] of Object.entries(defaultMessages)) {
      expect(english, `englishMessages drops ${key}`).toHaveProperty([key]);
      expect(english[key], `englishMessages overrides ${key}`).toEqual(text);
    }
  });

  it("renames the four collided keys beside the controller keys they hit", () => {
    for (const key of collidedWithControllerKeys) {
      expect(defaultMessages, `not a controller key: ${key}`).toHaveProperty([
        key,
      ]);
    }
    for (const key of movedBesideThem) {
      expect(english, `missing key: ${key}`).toHaveProperty([key]);
      expect(
        defaultMessages,
        `${key} is a component key, not a controller key`,
      ).not.toHaveProperty([key]);
      expect(english[key], `${key} holds no text`).not.toBeUndefined();
    }
  });
});
