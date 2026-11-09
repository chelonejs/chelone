import {
  createI18n,
  englishMessages,
  type I18nProvider,
  type MessageCatalog,
} from "@chelone/core";
import { testI18nProviderContract } from "@chelone/test-utils/i18n-provider-contract";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18nextProvider, toI18nextResource } from "./index";

/** A fresh instance holding `messages` in memory, so `changeLanguage` settles synchronously. */
function instanceWith(options: {
  locale: string;
  messages: Record<string, MessageCatalog>;
  fallbackLocale?: string;
}) {
  const instance = i18next.createInstance();
  const resources = Object.fromEntries(
    Object.entries(options.messages).map(([locale, catalog]) => [
      locale,
      { translation: toI18nextResource(catalog) },
    ]),
  );
  void instance.init({
    lng: options.locale,
    fallbackLng: options.fallbackLocale,
    resources,
    initAsync: false,
  });
  return instance;
}

describe("createI18nextProvider", () => {
  testI18nProviderContract((options) =>
    createI18nextProvider(instanceWith(options)),
  );

  describe("translate", () => {
    const provider = () =>
      createI18nextProvider(
        instanceWith({
          locale: "en",
          messages: {
            en: {
              "action.save": "Save",
              greeting: "Hello {name}",
              "items.selected": { one: "one", other: "many" },
            },
          },
        }),
      );

    it("uses _ for a missing key, filled with the same params, and ignores it for a key that exists", () => {
      const i18n = provider();
      expect(i18n.translate("no.such.key", { _: "Fallback" })).toBe("Fallback");
      expect(
        i18n.translate("no.such.key", { _: "Hi {name}", name: "Ada" }),
      ).toBe("Hi Ada");
      expect(i18n.translate("action.save", { _: "Ignored" })).toBe("Save");
    });

    it("chooses the plural form from smart_count, and from count when both are given", () => {
      const i18n = provider();
      expect(i18n.translate("items.selected", { smart_count: 1 })).toBe("one");
      expect(i18n.translate("items.selected", { smart_count: 2 })).toBe("many");
      expect(
        i18n.translate("items.selected", { count: 2, smart_count: 1 }),
      ).toBe("many");
      expect(
        i18n.translate("items.selected", { count: 1, smart_count: 2 }),
      ).toBe("one");
    });

    it("returns a plain message whole when a count is given", () => {
      expect(provider().translate("action.save", { count: 3 })).toBe("Save");
    });

    it("returns a value containing < and & unescaped", () => {
      expect(
        provider().translate("greeting", { name: "<b>Tom & Jerry</b>" }),
      ).toBe("Hello <b>Tom & Jerry</b>");
    });

    it("reads a param named like an i18next option as plain text", () => {
      const i18n = createI18nextProvider(
        instanceWith({
          locale: "en",
          messages: { en: { label: "{context} in {ns}" } },
        }),
      );
      expect(i18n.translate("label", { context: "male", ns: "admin" })).toBe(
        "male in admin",
      );
    });
  });

  describe("on an app's own instance", () => {
    it("keeps {{name}} interpolation working after the wrapper has been used", async () => {
      const instance = i18next.createInstance();
      await instance.init({
        lng: "en",
        resources: {
          en: { translation: { app: "Hi {{name}}", chelone: "Hi {name}" } },
        },
      });
      const i18n = createI18nextProvider(instance);

      expect(i18n.translate("chelone", { name: "Ada" })).toBe("Hi Ada");
      expect(instance.t("app", { name: "Ada" })).toBe("Hi Ada");
      expect(instance.t("chelone", { name: "Ada" })).toBe("Hi {name}");
    });

    it("removes only its own languageChanged listener on unsubscribe", async () => {
      const instance = i18next.createInstance();
      await instance.init({
        lng: "en",
        resources: { en: { translation: {} }, fr: { translation: {} } },
      });
      const own = vi.fn();
      instance.on("languageChanged", own);
      const provider = createI18nextProvider(instance);
      const wrapped = vi.fn();

      const unsubscribe = provider.subscribe(wrapped);
      await instance.changeLanguage("fr");
      expect(wrapped).toHaveBeenCalledTimes(1);

      unsubscribe();
      await instance.changeLanguage("en");
      expect(wrapped).toHaveBeenCalledTimes(1);
      expect(own).toHaveBeenCalledTimes(2);
    });
  });

  describe("toI18nextResource", () => {
    it("copies a string entry and splits a plural entry into one key per category", () => {
      expect(
        toI18nextResource({
          "action.save": "Save",
          "items.deleted": { one: "a", few: "b", many: "c", other: "d" },
        }),
      ).toEqual({
        "action.save": "Save",
        "items.deleted_one": "a",
        "items.deleted_few": "b",
        "items.deleted_many": "c",
        "items.deleted_other": "d",
      });
    });

    it("renders englishMessages the way createI18n does", () => {
      const i18n = createI18nextProvider(
        instanceWith({ locale: "en", messages: { en: englishMessages } }),
      );

      expect(i18n.translate("chelone.action.add_filter")).toBe("Add filter");
      expect(i18n.translate("chelone.page.create", { name: "Post" })).toBe(
        "Create Post",
      );
      expect(i18n.translate("chelone.action.bulk_actions", { count: 1 })).toBe(
        "1 item selected",
      );
      expect(i18n.translate("chelone.action.bulk_actions", { count: 4 })).toBe(
        "4 items selected",
      );
    });

    it("matches createI18n for every englishMessages key", () => {
      const expected: I18nProvider = createI18n<MessageCatalog>({
        locale: "en",
        messages: { en: englishMessages },
      });
      const actual = createI18nextProvider(
        instanceWith({ locale: "en", messages: { en: englishMessages } }),
      );
      const params = { name: "Posts", recordRepresentation: "First" };

      for (const key of Object.keys(englishMessages)) {
        for (const count of [undefined, 1, 4]) {
          const given = count === undefined ? params : { ...params, count };
          expect(actual.translate(key, given), `${key} @ ${count}`).toBe(
            expected.translate(key, given),
          );
        }
      }
    });
  });
});
