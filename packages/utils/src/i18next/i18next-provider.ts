import type {
  I18nProvider,
  MessageCatalog,
  TranslateParamValues,
} from "@chelone/core";
import type { i18n as I18next } from "i18next";

/** `{name}` placeholders, as the catalog writes them, instead of i18next's `{{name}}`. */
const CHELONE_INTERPOLATION = {
  prefix: "{",
  suffix: "}",
  escapeValue: false,
};

/** The numeric plural count, or `undefined` when the params name none. */
function pluralCount(params: TranslateParamValues): number | undefined {
  const raw = params.count ?? params.smart_count;
  if (raw === undefined) return undefined;
  const count = Number(raw);
  return Number.isNaN(count) ? undefined : count;
}

/**
 * Turns a Chelone catalog into an i18next resource bundle for one language and
 * namespace: a string entry is copied, and a plural entry becomes one
 * `key_<category>` entry per form, the suffixes i18next picks with the same
 * `Intl.PluralRules` categories.
 */
export function toI18nextResource(
  catalog: MessageCatalog,
): Record<string, string> {
  const resource: Record<string, string> = {};
  for (const [key, message] of Object.entries(catalog)) {
    if (typeof message === "string") {
      resource[key] = message;
      continue;
    }
    for (const [category, text] of Object.entries(message)) {
      resource[`${key}_${category}`] = text;
    }
  }
  return resource;
}

/**
 * Wraps an i18next instance as the `I18nProvider` `<Admin i18n>` takes. The
 * instance keeps its own interpolation settings: `{name}` placeholders are set
 * per call, so the app's `{{name}}` messages still work.
 */
export function createI18nextProvider(i18n: I18next): I18nProvider {
  return {
    translate(key, params = {}) {
      const { _, ...values } = params;
      const count = pluralCount(params);
      const replace: TranslateParamValues = { ...values };
      const raw = params.count ?? params.smart_count;
      if (count !== undefined && raw !== undefined) {
        replace.count = params.count ?? raw;
        replace.smart_count = params.smart_count ?? raw;
      }
      // i18next never falls back to `other` for a plural category the message
      // lacks, or when there is no count at all; the contract wants both. Look
      // in the active language only: a fallback language's matching form would
      // otherwise beat the active language's own `other`.
      const pluralOptions = count === undefined ? undefined : { count };
      const activeOnly = { fallbackLng: false } as const;
      const lookup =
        !i18n.exists(key, { ...pluralOptions, ...activeOnly }) &&
        i18n.exists(`${key}_other`, activeOnly)
          ? `${key}_other`
          : key;
      return i18n.t(lookup, {
        ...(typeof _ === "string" && { defaultValue: _ }),
        ...(lookup === key && pluralOptions),
        replace,
        interpolation: CHELONE_INTERPOLATION,
      });
    },
    getLocale: () => i18n.language,
    setLocale(locale) {
      if (locale === i18n.language) return;
      void i18n.changeLanguage(locale);
    },
    getLocales: () => Object.keys(i18n.store.data),
    subscribe(callback) {
      const listener = () => callback();
      i18n.on("languageChanged", listener);
      return () => i18n.off("languageChanged", listener);
    },
  };
}
