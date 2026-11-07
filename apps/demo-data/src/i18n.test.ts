import { describe, expect, it } from "vitest";
import { demoMenuKey, makeDemoI18n } from "./i18n";

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

/**
 * Every demo string the Dashboard and the sidebar read through `translate`, as
 * `[key, English default, French text]`. The demos pass the English default as
 * `_`, so pinning it here pins what English shows too.
 */
const demoStrings: [string, string, string][] = [
  ["demo.dashboard.title", "Dashboard", "Tableau de bord"],
  ["demo.dashboard.revenue", "Revenue", "Chiffre d'affaires"],
  ["demo.dashboard.orders", "Orders", "Commandes"],
  ["demo.dashboard.average_order", "Average order", "Commande moyenne"],
  ["demo.dashboard.pending_orders", "Pending orders", "Commandes en attente"],
  [
    "demo.dashboard.revenue_by_delivery_day",
    "Revenue by delivery day",
    "Chiffre d'affaires par jour de livraison",
  ],
  [
    "demo.dashboard.orders_by_status",
    "Orders by status",
    "Commandes par statut",
  ],
  [
    "demo.dashboard.revenue_by_status",
    "Revenue by status",
    "Chiffre d'affaires par statut",
  ],
  [
    "demo.dashboard.order_value_by_status_and_slot",
    "Order value by status and delivery slot",
    "Valeur des commandes par statut et créneau de livraison",
  ],
  ["demo.dashboard.running_jobs", "Running jobs", "Tâches en cours"],
  ["demo.menu.group.account", "Account", "Compte"],
  ["demo.menu.group.catalog", "Catalog", "Catalogue"],
  ["demo.menu.group.content", "Content", "Contenu"],
  ["demo.menu.group.orders", "Orders", "Commandes"],
  ["demo.menu.group.settings", "Settings", "Paramètres"],
  ["demo.menu.group.shop", "Shop", "Boutique"],
  ["demo.menu.group.system", "System", "Système"],
  ["demo.menu.group.team", "Team", "Équipe"],
  ["demo.menu.page.activity", "Activity", "Activité"],
  ["demo.menu.page.approvals", "Approvals", "Approbations"],
  ["demo.menu.page.integrations", "Integrations", "Intégrations"],
  ["demo.menu.page.landing_page", "Landing page", "Page d'accueil"],
  ["demo.menu.page.login", "Sign in", "Se connecter"],
  ["demo.menu.page.order_board", "Order board", "Tableau des commandes"],
  [
    "demo.menu.page.order_calendar",
    "Delivery calendar",
    "Calendrier de livraison",
  ],
  [
    "demo.menu.page.product_variants",
    "Product variants",
    "Variantes de produit",
  ],
  ["demo.menu.page.status", "Status", "Statut"],
  [
    "demo.menu.page.supabase_auth",
    "Supabase auth",
    "Authentification Supabase",
  ],
  ["demo.menu.page.team", "Team", "Équipe"],
];

describe("the demo i18n", () => {
  it("offers English and French, English first", () => {
    const { i18n } = makeDemoI18n();

    expect(i18n.getLocales()).toEqual(["en", "fr"]);
    expect(i18n.getLocale()).toBe("en");
  });

  it("reports a key the French catalog lacks and shows its English meanwhile", () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");

    expect(i18n.translate("ra.action.refresh")).toBe("Refresh");
    expect(missingKeys.getEntries("fr").map((entry) => entry.key)).toContain(
      "ra.action.refresh",
    );
  });

  it("changes the string once a translation is typed for the missing key", async () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");
    i18n.translate("ra.action.refresh");

    missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    expect(i18n.translate("ra.action.refresh")).toBe("Actualiser");
  });

  it("tells subscribers once the new text is in place, and keeps the locale", async () => {
    const demo = makeDemoI18n();
    demo.i18n.setLocale("fr");
    demo.i18n.translate("ra.action.refresh");
    const seen: string[] = [];
    demo.subscribe(() => seen.push(demo.i18n.translate("ra.action.refresh")));
    const before = demo.version();

    demo.missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    expect(seen).toEqual(["Actualiser"]);
    expect(demo.version()).not.toBe(before);
    expect(demo.i18n.getLocale()).toBe("fr");
  });

  it("stays quiet when a key is recorded but nothing was typed", async () => {
    const demo = makeDemoI18n();
    const seen: string[] = [];
    demo.subscribe(() => seen.push("changed"));

    demo.missingKeys.record("demo.unknown", "en", undefined);
    await flush();

    expect(seen).toEqual([]);
  });

  it("goes back to English when the typed translation is cleared", async () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");
    i18n.translate("ra.action.refresh");
    missingKeys.setTranslation("fr", "ra.action.refresh", "Actualiser");
    await flush();

    missingKeys.setTranslation("fr", "ra.action.refresh", "");
    await flush();

    expect(i18n.translate("ra.action.refresh")).toBe("Refresh");
  });

  it("keeps an English translation typed here out of the next i18n", async () => {
    const first = makeDemoI18n();
    first.i18n.translate("demo.team.title", { _: "Team" });
    first.missingKeys.setTranslation("en", "demo.team.title", "Crew");
    await flush();
    expect(first.i18n.translate("demo.team.title", { _: "Team" })).toBe("Crew");

    const second = makeDemoI18n();
    expect(second.i18n.translate("demo.team.title", { _: "Team" })).toBe(
      "Team",
    );
  });
});

describe("the demo strings", () => {
  it("reads the English default for every demo key with English selected", () => {
    const { i18n } = makeDemoI18n();

    for (const [key, english] of demoStrings) {
      expect(i18n.translate(key, { _: english })).toBe(english);
    }
  });

  it("reads the French text for every demo key with French selected", () => {
    const { i18n } = makeDemoI18n();
    i18n.setLocale("fr");

    for (const [key, english, french] of demoStrings) {
      expect(i18n.translate(key, { _: english })).toBe(french);
    }
  });

  it("names each sidebar label by its group name or route path", () => {
    expect(demoMenuKey("group", "Catalog")).toBe("demo.menu.group.catalog");
    // The React demo names its pages `order-board`, the Vue demo `OrderBoard`.
    for (const path of ["order-board", "OrderBoard"]) {
      expect(demoMenuKey("page", path)).toBe("demo.menu.page.order_board");
    }
    for (const path of ["landing-page", "LandingPage"]) {
      expect(demoMenuKey("page", path)).toBe("demo.menu.page.landing_page");
    }
    for (const path of ["supabase-auth", "SupabaseAuth"]) {
      expect(demoMenuKey("page", path)).toBe("demo.menu.page.supabase_auth");
    }
  });

  it("inflects the resource labels in French", () => {
    const { i18n } = makeDemoI18n();
    i18n.setLocale("fr");

    expect(
      i18n.translate("resources.posts.name", { count: 2, smart_count: 2 }),
    ).toBe("Articles");
    expect(
      i18n.translate("resources.posts.name", { count: 1, smart_count: 1 }),
    ).toBe("Article");
  });

  it("leaves the English resource labels to the humanized default", () => {
    const { i18n } = makeDemoI18n();

    // `useGetResourceLabel` falls back to the humanized name when the key echoes.
    expect(
      i18n.translate("resources.posts.name", { count: 2, smart_count: 2 }),
    ).toBe("resources.posts.name");
  });
});

describe("what French still lacks", () => {
  it("leaves Chelone keys untranslated for the editor to list", () => {
    const { i18n, missingKeys } = makeDemoI18n();
    i18n.setLocale("fr");

    const keys = [
      "ra.page.dashboard",
      "ra.page.list",
      "chelone.command_menu.resources",
    ];
    for (const key of keys) i18n.translate(key);

    const listed = missingKeys.getEntries("fr").map((entry) => entry.key);
    for (const key of keys) expect(listed).toContain(key);
  });
});
