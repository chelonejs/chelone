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
  /**
   * Called after a typed translation went into a catalog. The adapters' hooks
   * re-read `translate` on a locale change only, so a page that should show the
   * new text as it is typed subscribes here and re-renders itself.
   */
  subscribe(callback: () => void): () => void;
  /** A number that changes with every such notification: the snapshot to subscribe with. */
  version(): number;
}

/**
 * The English i18n catalog. `englishMessages` is core's English for the `ra.*`
 * keys the components translate, the `chelone.*` controller messages and the
 * map labels; an `<Admin>` with no `i18n` prop reads the same. To add or
 * override entries, spread it: `{ ...englishMessages, "ra.page.list": "All {name}" }`.
 */
export function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en: englishMessages },
    fallbackLocale: "en",
  });
}

/**
 * The apps' i18n: `makeI18n`'s English with a French catalog beside it.
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

  const subscribers = new Set<() => void>();
  let version = 0;
  missingKeys.subscribe(() => {
    if (!apply()) return;
    version += 1;
    for (const callback of [...subscribers]) callback();
  });

  return {
    i18n: base,
    missingKeys,
    subscribe(callback) {
      subscribers.add(callback);
      return () => void subscribers.delete(callback);
    },
    version: () => version,
  };
}
