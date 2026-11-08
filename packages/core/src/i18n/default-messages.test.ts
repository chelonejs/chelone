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
 * The four component keys that moved from `ra.*` to `chelone.*` (#1839) and
 * landed on a controller key that already says something else. Each keeps its
 * group and names its role instead of overwriting the controller, so the
 * shipped English is exactly what it was before the move.
 */
const renamedBesideControllerKeys = [
  {
    from: "ra.message.access_denied",
    to: "chelone.message.access_denied_detail",
    text: "You don't have the right permissions to access this page",
    controllerKey: "chelone.message.access_denied",
    controllerText: "You don't have access to this page",
  },
  {
    from: "ra.message.authentication_error",
    to: "chelone.message.authentication_error_detail",
    text: "The authentication server returned an error and your credentials could not be checked.",
    controllerKey: "chelone.message.authentication_error",
    controllerText: "The authentication server returned an error",
  },
  {
    from: "ra.message.loading",
    to: "chelone.message.loading_detail",
    text: "Please wait",
    controllerKey: "chelone.message.loading",
    controllerText: "The page is loading, just a moment please",
  },
  {
    from: "ra.notification.http_error",
    to: "chelone.notification.http_error_label",
    text: "Error",
    controllerKey: "chelone.notification.http_error",
    controllerText: "Server communication error",
  },
] as const;

/**
 * The moved keys whose English already matched a controller key's word for
 * word. They merged into it: `englishMessages` inherits the entry instead of
 * repeating it, and the components read the controller key.
 */
const mergedIntoControllerKeys = [
  ["ra.auth.logout", "chelone.auth.logout"],
  ["ra.auth.auth_check_error", "chelone.auth.auth_check_error"],
  ["ra.message.invalid_form", "chelone.message.invalid_form"],
  ["ra.message.not_found", "chelone.message.not_found"],
  ["ra.validation.required", "chelone.validation.required"],
  ["ra.validation.minLength", "chelone.validation.minLength"],
  ["ra.validation.maxLength", "chelone.validation.maxLength"],
  ["ra.validation.minValue", "chelone.validation.minValue"],
  ["ra.validation.maxValue", "chelone.validation.maxValue"],
  ["ra.validation.number", "chelone.validation.number"],
  ["ra.validation.email", "chelone.validation.email"],
] as const;

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

  it("renames each collided key to its own name and keeps the shipped English", () => {
    for (const {
      from,
      to,
      text,
      controllerKey,
      controllerText,
    } of renamedBesideControllerKeys) {
      expect(english, `${from} never became ${to}`).toHaveProperty([to]);
      expect(english[to], `${to} no longer holds the moved English`).toEqual(
        text,
      );
      expect(
        defaultMessages,
        `${to} is a component key, not a controller key`,
      ).not.toHaveProperty([to]);
      expect(
        defaultMessages[controllerKey],
        `${controllerKey} lost the text its controller emits`,
      ).toEqual(controllerText);
    }
  });

  it("merges the keys whose English already matched a controller key", () => {
    for (const [from, to] of mergedIntoControllerKeys) {
      expect(
        defaultMessages,
        `${from} has no controller key behind it: ${to}`,
      ).toHaveProperty([to]);
      expect(
        english[to],
        `${to} is not the controller's entry read through`,
      ).toEqual(defaultMessages[to]);
    }
  });
});
