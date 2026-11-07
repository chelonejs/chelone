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
 *
 * The `demo.*` entries are the demos' own strings — the Dashboard and the
 * sidebar — which the shells read through `translate` with the English text as
 * the `_` default. `resources.*.name` is the key `<ResourceMenuItem>` looks a
 * resource label up under, so the sidebar's resource entries follow the locale
 * too.
 */
const frenchMessages: MessageCatalog = {
  "ra.action.cancel": "Annuler",
  "ra.action.create": "Créer",
  "ra.action.delete": "Supprimer",
  "ra.action.edit": "Modifier",
  "ra.action.save": "Enregistrer",
  "ra.action.show": "Afficher",
  "ra.action.change_locale": "Changer de langue",
  "demo.dashboard.title": "Tableau de bord",
  "demo.dashboard.revenue": "Chiffre d'affaires",
  "demo.dashboard.orders": "Commandes",
  "demo.dashboard.average_order": "Commande moyenne",
  "demo.dashboard.pending_orders": "Commandes en attente",
  "demo.dashboard.revenue_by_delivery_day":
    "Chiffre d'affaires par jour de livraison",
  "demo.dashboard.orders_by_status": "Commandes par statut",
  "demo.dashboard.revenue_by_status": "Chiffre d'affaires par statut",
  "demo.dashboard.order_value_by_status_and_slot":
    "Valeur des commandes par statut et créneau de livraison",
  "demo.dashboard.running_jobs": "Tâches en cours",
  "demo.menu.group.account": "Compte",
  "demo.menu.group.catalog": "Catalogue",
  "demo.menu.group.content": "Contenu",
  "demo.menu.group.orders": "Commandes",
  "demo.menu.group.settings": "Paramètres",
  "demo.menu.group.shop": "Boutique",
  "demo.menu.group.system": "Système",
  "demo.menu.group.team": "Équipe",
  "demo.menu.page.activity": "Activité",
  "demo.menu.page.approvals": "Approbations",
  "demo.menu.page.integrations": "Intégrations",
  "demo.menu.page.landing_page": "Page d'accueil",
  "demo.menu.page.login": "Se connecter",
  "demo.menu.page.order_board": "Tableau des commandes",
  "demo.menu.page.order_calendar": "Calendrier de livraison",
  "demo.menu.page.product_variants": "Variantes de produit",
  "demo.menu.page.status": "Statut",
  "demo.menu.page.supabase_auth": "Authentification Supabase",
  "demo.menu.page.team": "Équipe",
  "resources.authors.name": { one: "Auteur", other: "Auteurs" },
  "resources.categories.name": { one: "Catégorie", other: "Catégories" },
  "resources.customers.name": { one: "Client", other: "Clients" },
  "resources.orders.name": { one: "Commande", other: "Commandes" },
  "resources.pages.name": { one: "Page", other: "Pages" },
  "resources.places.name": { one: "Lieu", other: "Lieux" },
  "resources.posts.name": { one: "Article", other: "Articles" },
  "resources.products.name": { one: "Produit", other: "Produits" },
  "resources.tags.name": { one: "Étiquette", other: "Étiquettes" },
};

/** Which kind of sidebar label `demoMenuKey` names. */
export type DemoMenuKeyKind = "group" | "page";

/**
 * The key a sidebar label is looked up under: `demo.menu.group.catalog` for a
 * group heading, `demo.menu.page.order_board` for a page title. Both demos
 * build it from the same name — a group name or a route path — so they read
 * one copy of the catalog.
 */
export function demoMenuKey(kind: DemoMenuKeyKind, name: string): string {
  const slug = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
  return `demo.menu.${kind}.${slug}`;
}

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
 * The apps' i18n: `makeI18n`'s English with a French catalog beside it. Both
 * are copies, since typed translations are written into them.
 * French is partial, with English as its fallback. A translation typed into
 * `<I18nKeyEditor>` goes into the French catalog, so the demo's own strings
 * change as it is typed; clearing the text puts the English back. `extra` goes
 * into the English catalog, for an add-on's messages such as Supabase's.
 */
export function makeDemoI18n(extra: MessageCatalog = {}): DemoI18n {
  const missingKeys = createMissingKeyStore();
  const messages: Record<string, MessageCatalog> = {
    en: { ...englishMessages, ...extra },
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
