import {
  type AnyCheloneI18n,
  createI18n,
  createMissingKeyStore,
  englishMessages,
  type MessageCatalog,
  type MissingKeyStore,
} from "@chelone/core";

/**
 * A few labels in French. The rest of the catalog is left out on purpose: the
 * keys French lacks are what `<I18nKeyEditor>` lists for someone to translate.
 */
const frenchMessages: MessageCatalog = {
  "ra.action.cancel": "Annuler",
  "ra.action.create": "Créer",
  "ra.action.delete": "Supprimer",
  "ra.action.edit": "Modifier",
  "ra.action.save": "Enregistrer",
  "ra.action.show": "Afficher",
  "ra.action.change_locale": "Changer de langue",
};

export interface DemoI18n {
  i18n: AnyCheloneI18n;
  /** Fed by every key the current locale lacks; mount `<I18nKeyEditor>` with it. */
  missingKeys: MissingKeyStore;
}

/**
 * The i18n catalog. `englishMessages` is core's English for the `ra.*` keys the
 * components translate, the `chelone.*` controller messages and the map labels;
 * an `<Admin>` with no `i18n` prop reads the same. To add or override entries,
 * spread it: `{ ...englishMessages, "ra.page.list": "All {name}" }`.
 *
 * French is partial, with English as its fallback. A translation typed into
 * `<I18nKeyEditor>` goes into the French catalog, so the demo's own strings
 * change as it is typed; clearing the text puts the English back.
 */
export function makeDemoI18n(): DemoI18n {
  const missingKeys = createMissingKeyStore();
  const messages: Record<string, MessageCatalog> = {
    en: englishMessages,
    fr: { ...frenchMessages },
  };
  const base: AnyCheloneI18n = createI18n({
    locale: "en",
    messages,
    fallbackLocale: "en",
    onMissingKey: missingKeys.record,
  });
  // What each locale got from the editor, so clearing one can put the English back.
  const typed = new Map<string, Set<string>>();

  const apply = (): boolean => {
    let changed = false;
    for (const [locale, catalog] of Object.entries(messages)) {
      const keys = typed.get(locale) ?? new Set<string>();
      typed.set(locale, keys);
      for (const { key, translation } of missingKeys.getEntries(locale)) {
        const text = translation.trim() === "" ? undefined : translation;
        if (text === undefined && keys.has(key)) {
          Reflect.deleteProperty(catalog, key);
          keys.delete(key);
          changed = true;
        } else if (text !== undefined && catalog[key] !== text) {
          catalog[key] = text;
          keys.add(key);
          changed = true;
        }
      }
    }
    return changed;
  };

  missingKeys.subscribe(() => {
    if (!apply()) return;
    // The adapters' hooks re-read on a locale change only, so a round trip
    // through another locale is what makes every mounted label read the new text.
    const current = base.getLocale();
    const other = base.getLocales().find((locale) => locale !== current);
    if (other === undefined) return;
    base.setLocale(other);
    base.setLocale(current);
  });

  return { i18n: base, missingKeys };
}
