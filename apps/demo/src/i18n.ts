import { createI18n, englishMessages } from "@chelone/core";

/**
 * The i18n catalog. `englishMessages` is core's English for the `ra.*` keys the
 * components translate, the `chelone.*` controller messages and the map labels;
 * an `<Admin>` with no `i18n` prop reads the same. To add or override entries,
 * spread it: `{ ...englishMessages, "ra.page.list": "All {name}" }`.
 */
export function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en: englishMessages },
    fallbackLocale: "en",
  });
}
