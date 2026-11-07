import { createI18n, englishMessages } from "@chelone/core";

/**
 * The i18n catalog. `englishMessages` is core's English for the `ra.*` keys the
 * components translate, the `chelone.*` controller messages and the map labels;
 * an `<Admin>` with no `i18n` prop reads the same. To add or override entries,
 * spread it: `{ ...englishMessages, "ra.page.list": "All {name}" }`. `extra`
 * is spread after it, for an add-on's catalog such as Supabase's.
 */
export function makeI18n(extra: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: { ...englishMessages, ...extra } },
    fallbackLocale: "en",
  });
}
