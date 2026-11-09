/**
 * The `I18nProvider` contract as a runnable suite, for an engine that is not
 * `createI18n`. Hand it a factory and it registers the vitest cases every
 * provider must pass: `<Admin i18n>` will accept the object, so the object has
 * to behave this way.
 *
 * This package imports no Chelone package, so the catalog and provider types
 * below are the structural shape of `@chelone/core`'s own, written out again on
 * purpose: a provider from any package, or from no package, can be checked here.
 */

import { describe, expect, it, vi } from "vitest";

/** Plural forms keyed by `Intl.PluralRules` categories; `other` is the mandatory fallback. */
export type ContractPluralMessage = Partial<
  Record<Intl.LDMLPluralRule, string>
> & { other: string };

/** A catalog entry: a plain string, or the plural forms of one message. */
export type ContractMessageValue = string | ContractPluralMessage;

/** A catalog: a flat map of keys to messages. */
export type ContractCatalog = Record<string, ContractMessageValue>;

/**
 * The params a message reads. `_` is the default text for a missing key;
 * `count` and `smart_count` both name the plural count.
 */
export type ContractParams = Record<string, string | number>;

/** The provider under test, in its catalog-erased shape. */
export interface ContractProvider {
  translate(key: string, params?: ContractParams): string;
  getLocale(): string;
  setLocale(locale: string): void;
  getLocales(): string[];
  subscribe(callback: () => void): () => void;
}

/** What the factory is handed: the locale to start on, a catalog per locale, and an optional fallback locale. */
export interface ContractOptions {
  locale: string;
  messages: Record<string, ContractCatalog>;
  fallbackLocale?: string;
}

/** Builds one provider, fresh for each case. */
export type ContractProviderFactory = (
  options: ContractOptions,
) => ContractProvider;

const en: ContractCatalog = {
  "action.save": "Save",
  greeting: "Hello {name}",
  "items.selected": {
    one: "{count} item selected",
    other: "{count} items selected",
  },
};

const fr: ContractCatalog = {
  "action.save": "Enregistrer",
  greeting: "Bonjour {name}",
  "items.selected": {
    one: "{count} article sélectionné",
    other: "{count} articles sélectionnés",
  },
};

/** Polish needs `one`, `few` and `many`: 1, 3 and 5 pick a different form each. */
const pl: ContractCatalog = {
  "items.deleted": {
    one: "{count} element usunięty",
    few: "{count} elementy usunięte",
    many: "{count} elementów usuniętych",
    other: "{count} elementu usunięte",
  },
};

/**
 * Registers the contract cases for `newProvider`. Call it at the top level of a
 * test file, with your own factory:
 *
 * ```ts
 * testI18nProviderContract((options) => myProvider(options));
 * ```
 *
 * `fallbackLocale` is passed to the factory because `createI18n` takes it, but
 * only the key echo is pinned here: which catalog a provider falls back to is
 * its own story, not a member of `I18nProvider`.
 */
export function testI18nProviderContract(
  newProvider: ContractProviderFactory,
): void {
  const english = () => newProvider({ locale: "en", messages: { en, fr } });

  describe("i18n provider contract", () => {
    it("translates a plain key in the active locale", () => {
      expect(english().translate("action.save")).toBe("Save");
      expect(
        newProvider({ locale: "fr", messages: { en, fr } }).translate(
          "action.save",
        ),
      ).toBe("Enregistrer");
    });

    it("fills {name} from the params and leaves an unknown placeholder as written", () => {
      const i18n = english();
      expect(i18n.translate("greeting", { name: "Rin" })).toBe("Hello Rin");
      expect(i18n.translate("greeting", { other: "Ada" })).toBe("Hello {name}");
      expect(i18n.translate("greeting")).toBe("Hello {name}");
    });

    it("returns the key for a missing key, and never throws", () => {
      const i18n = english();
      expect(() => i18n.translate("no.such.key")).not.toThrow();
      expect(i18n.translate("no.such.key")).toBe("no.such.key");
    });

    it("uses a string _ only for a missing key, interpolated with the same params", () => {
      const i18n = english();
      expect(i18n.translate("auth.sign_in", { _: "Sign in" })).toBe("Sign in");
      expect(
        i18n.translate("auth.sign_in", { _: "Sign in, {name}", name: "Ada" }),
      ).toBe("Sign in, Ada");
      expect(i18n.translate("action.save", { _: "IGNORED" })).toBe("Save");
    });

    it("picks the plural form from count or smart_count", () => {
      const i18n = english();
      expect(i18n.translate("items.selected", { count: 1 })).toBe(
        "1 item selected",
      );
      expect(i18n.translate("items.selected", { count: 3 })).toBe(
        "3 items selected",
      );
      expect(i18n.translate("items.selected", { smart_count: 1 })).toBe(
        "1 item selected",
      );
      expect(i18n.translate("items.selected", { smart_count: 3 })).toBe(
        "3 items selected",
      );
    });

    it("lets count win when count and smart_count disagree", () => {
      expect(
        english().translate("items.selected", { count: 1, smart_count: 3 }),
      ).toBe("1 item selected");
    });

    it("uses the other form when no count is given", () => {
      expect(english().translate("items.selected")).toBe(
        "{count} items selected",
      );
    });

    it("picks a form for a locale with more than one and other", () => {
      const i18n = newProvider({ locale: "pl", messages: { pl } });
      expect(i18n.translate("items.deleted", { count: 1 })).toBe(
        "1 element usunięty",
      );
      expect(i18n.translate("items.deleted", { count: 3 })).toBe(
        "3 elementy usunięte",
      );
      expect(i18n.translate("items.deleted", { count: 5 })).toBe(
        "5 elementów usuniętych",
      );
    });

    it("falls back to the other form for a category the message lacks", () => {
      const i18n = newProvider({
        locale: "pl",
        messages: {
          pl: {
            "items.deleted": { one: "1 element", other: "{count} elementów" },
          },
        },
      });
      expect(i18n.translate("items.deleted", { count: 5 })).toBe("5 elementów");
    });

    it("reports the active locale and every catalog", () => {
      const i18n = english();
      expect(i18n.getLocale()).toBe("en");
      expect([...i18n.getLocales()].sort()).toEqual(["en", "fr"]);
    });

    it("changes the output on setLocale and notifies each subscriber once", () => {
      const i18n = english();
      const onLocale = vi.fn();
      i18n.subscribe(onLocale);
      i18n.setLocale("fr");
      expect(i18n.getLocale()).toBe("fr");
      expect(i18n.translate("action.save")).toBe("Enregistrer");
      expect(onLocale).toHaveBeenCalledTimes(1);
    });

    it("notifies no one for the locale already active", () => {
      const i18n = english();
      const onLocale = vi.fn();
      i18n.subscribe(onLocale);
      i18n.setLocale("en");
      expect(onLocale).not.toHaveBeenCalled();
    });

    it("stops notifying after the unsubscribe", () => {
      const i18n = english();
      const onLocale = vi.fn();
      const unsubscribe = i18n.subscribe(onLocale);
      unsubscribe();
      i18n.setLocale("fr");
      expect(onLocale).not.toHaveBeenCalled();
    });

    it("returns the key when neither the locale nor the fallback locale holds it", () => {
      expect(
        newProvider({
          locale: "fr",
          messages: { en, fr: {} },
          fallbackLocale: "en",
        }).translate("no.such.key"),
      ).toBe("no.such.key");
    });
  });
}
