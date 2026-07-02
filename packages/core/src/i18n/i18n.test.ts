import { describe, expect, it, vi } from "vitest";
import { createI18n } from "./i18n";
import { defineMessages } from "./messages";

const en = defineMessages({
  "chelone.action.save": "Save",
  "chelone.greeting": "Hello {name}",
  "chelone.notification.deleted": {
    one: "1 element deleted",
    other: "{smart_count} elements deleted",
  },
});
const fr = defineMessages({
  "chelone.action.save": "Enregistrer",
  "chelone.greeting": "Bonjour {name}",
  "chelone.notification.deleted": {
    one: "1 élément supprimé",
    other: "{smart_count} éléments supprimés",
  },
});

const make = () => createI18n({ locale: "en", messages: { en, fr } });

describe("createI18n", () => {
  it("translates plain keys and interpolates placeholders", () => {
    const i18n = make();
    expect(i18n.translate("chelone.action.save")).toBe("Save");
    expect(i18n.translate("chelone.greeting", { name: "Rin" })).toBe(
      "Hello Rin",
    );
  });

  it("pluralizes via Intl.PluralRules with count", () => {
    const i18n = make();
    expect(
      i18n.translate("chelone.notification.deleted", {
        count: 1,
        smart_count: 1,
      }),
    ).toBe("1 element deleted");
    expect(
      i18n.translate("chelone.notification.deleted", {
        count: 4,
        smart_count: 4,
      }),
    ).toBe("4 elements deleted");
  });

  it("setLocale switches translations and notifies subscribers synchronously", () => {
    const i18n = make();
    const cb = vi.fn();
    i18n.subscribe(cb);
    i18n.setLocale("fr");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(i18n.translate("chelone.action.save")).toBe("Enregistrer");
  });

  it("falls back to fallbackLocale for keys missing in the active locale, then to the key", () => {
    const i18n = createI18n({
      locale: "fr",
      fallbackLocale: "en",
      messages: {
        en,
        fr: defineMessages({ "chelone.action.save": "Enregistrer" }),
      },
    });
    expect(i18n.translate("chelone.greeting", { name: "Rin" })).toBe(
      "Hello Rin",
    ); // en fallback
    expect(i18n.translate("chelone.missing" as never)).toBe("chelone.missing"); // key fallback, no throw
  });

  it("setLocale of an unknown locale throws; getLocales lists catalogs", () => {
    const i18n = make();
    expect(i18n.getLocales().sort()).toEqual(["en", "fr"]);
    expect(() => i18n.setLocale("de")).toThrow(/unknown locale/i);
  });

  it("unsubscribe stops locale notifications", () => {
    const i18n = make();
    const cb = vi.fn();
    const unsub = i18n.subscribe(cb);
    unsub();
    i18n.setLocale("fr");
    expect(cb).not.toHaveBeenCalled();
  });
});
