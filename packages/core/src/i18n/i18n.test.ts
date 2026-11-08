import { describe, expect, it, vi } from "vitest";
import { type AnyCheloneI18n, createI18n } from "./i18n";
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

  it("a plural message picks its form from smart_count", () => {
    // Callers hold the catalog-erased view, where `count` is not required.
    const i18n: AnyCheloneI18n = make();
    expect(
      i18n.translate("chelone.notification.deleted", { smart_count: 1 }),
    ).toBe("1 element deleted");
    expect(
      i18n.translate("chelone.notification.deleted", { smart_count: 4 }),
    ).toBe("4 elements deleted");
  });

  it("a plural message interpolates {count} from smart_count", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "items.selected": { other: "{count} selected" } } },
    });
    const erased: AnyCheloneI18n = i18n;
    expect(erased.translate("items.selected", { smart_count: 3 })).toBe(
      "3 selected",
    );
  });

  it("an undefined or null count falls back to smart_count in the text too", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: { "items.selected": { other: "{count} selected" } } },
    });
    const erased: AnyCheloneI18n = i18n;
    expect(
      // @ts-expect-error the types refuse undefined; JS callers can still send it
      erased.translate("items.selected", { count: undefined, smart_count: 3 }),
    ).toBe("3 selected");
    expect(
      // @ts-expect-error the types refuse null; JS callers can still send it
      erased.translate("items.selected", { count: null, smart_count: 3 }),
    ).toBe("3 selected");
  });

  it("count wins over smart_count", () => {
    const i18n: AnyCheloneI18n = make();
    expect(
      i18n.translate("chelone.notification.deleted", {
        count: 1,
        smart_count: 4,
      }),
    ).toBe("1 element deleted");
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
    // The catalog-erased view takes any string key, which is what a missing key is.
    const loose: AnyCheloneI18n = i18n;
    expect(loose.translate("chelone.missing")).toBe("chelone.missing"); // key fallback, no throw
  });

  it("honors the polyglot `_` fallback for keys missing from the catalog", () => {
    // The catalog-erased view: what components hold, and the surface that
    // accepts an arbitrary key plus a `{ _: default }` param.
    const i18n: AnyCheloneI18n = make();
    // Missing key + string `_` → the fallback, not the echoed key.
    expect(i18n.translate("chelone.auth.sign_in", { _: "Sign in" })).toBe(
      "Sign in",
    );
    // Fallback is interpolated with the same params.
    expect(i18n.translate("greeting", { _: "Hi {name}", name: "Ada" })).toBe(
      "Hi Ada",
    );
    // Missing key + no `_` → unchanged key echo.
    expect(i18n.translate("missing")).toBe("missing");
    // Catalog hit ignores `_` entirely.
    expect(i18n.translate("chelone.action.save", { _: "IGNORED" })).toBe(
      "Save",
    );
  });

  it("treats Object.prototype names as missing keys, not catalog entries", () => {
    const i18n: AnyCheloneI18n = createI18n({
      locale: "en",
      fallbackLocale: "fr",
      messages: { en: {}, fr: {} },
    });
    expect(i18n.translate("constructor")).toBe("constructor");
    expect(i18n.translate("toString")).toBe("toString");
    expect(i18n.translate("toString", { _: "Default {x}", x: "1" })).toBe(
      "Default 1",
    );
  });

  it("setLocale of an unknown locale throws; getLocales lists catalogs", () => {
    const i18n = make();
    expect(i18n.getLocales().sort()).toEqual(["en", "fr"]);
    expect(() => i18n.setLocale("de")).toThrow(/unknown locale/i);
  });

  it("setLocale rejects Object.prototype keys (toString is not a locale)", () => {
    const i18n = make();
    expect(() => i18n.setLocale("toString")).toThrow(/unknown locale/i);
    expect(() => i18n.setLocale("hasOwnProperty")).toThrow(/unknown locale/i);
  });

  it("unsubscribe stops locale notifications", () => {
    const i18n = make();
    const cb = vi.fn();
    const unsub = i18n.subscribe(cb);
    unsub();
    i18n.setLocale("fr");
    expect(cb).not.toHaveBeenCalled();
  });

  it("calls onMissingKey with the key, the locale and the _ fallback", () => {
    const onMissingKey = vi.fn();
    const i18n: AnyCheloneI18n = createI18n({
      locale: "fr",
      messages: { en, fr: defineMessages({}) },
      onMissingKey,
    });
    i18n.translate("chelone.auth.sign_in", { _: "Sign in" });
    expect(onMissingKey).toHaveBeenCalledWith(
      "chelone.auth.sign_in",
      "fr",
      "Sign in",
    );
    i18n.translate("other.key");
    expect(onMissingKey).toHaveBeenLastCalledWith("other.key", "fr", undefined);
    i18n.translate("third.key", { _: 3 });
    expect(onMissingKey).toHaveBeenLastCalledWith("third.key", "fr", undefined);
  });

  it("calls onMissingKey when only the fallback locale holds the key", () => {
    const onMissingKey = vi.fn();
    const i18n = createI18n({
      locale: "fr",
      fallbackLocale: "en",
      messages: { en, fr: defineMessages({}) },
      onMissingKey,
    });
    expect(i18n.translate("chelone.action.save")).toBe("Save");
    expect(onMissingKey).toHaveBeenCalledWith(
      "chelone.action.save",
      "fr",
      undefined,
    );
  });

  it("does not call onMissingKey for a key the locale holds", () => {
    const onMissingKey = vi.fn();
    const i18n = createI18n({
      locale: "en",
      messages: { en, fr },
      onMissingKey,
    });
    i18n.translate("chelone.action.save");
    expect(onMissingKey).not.toHaveBeenCalled();
  });

  it("returns the same text with and without onMissingKey", () => {
    const messages = { en, fr: defineMessages({}) };
    const plain: AnyCheloneI18n = createI18n({ locale: "fr", messages });
    const watched: AnyCheloneI18n = createI18n({
      locale: "fr",
      messages,
      fallbackLocale: "en",
      onMissingKey: () => {},
    });
    const unwatched: AnyCheloneI18n = createI18n({
      locale: "fr",
      messages,
      fallbackLocale: "en",
    });
    expect(plain.translate("x.y")).toBe("x.y");
    expect(watched.translate("x.y")).toBe("x.y");
    expect(watched.translate("x.y", { _: "Hi {n}", n: 1 })).toBe("Hi 1");
    expect(plain.translate("x.y", { _: "Hi {n}", n: 1 })).toBe("Hi 1");
    expect(watched.translate("chelone.greeting", { name: "Rin" })).toBe(
      unwatched.translate("chelone.greeting", { name: "Rin" }),
    );
  });

  it("a throwing onMissingKey does not break translate", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = new Error("boom");
    const i18n: AnyCheloneI18n = createI18n({
      locale: "fr",
      messages: { en, fr: defineMessages({}) },
      onMissingKey: () => {
        throw boom;
      },
    });
    expect(i18n.translate("x.y", { _: "Hi" })).toBe("Hi");
    expect(error).toHaveBeenCalledWith(boom);
    error.mockRestore();
  });
});
