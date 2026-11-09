import { describe, expectTypeOf, it } from "vitest";
import type { RegisteredMessages } from "../resource/register";
import type { AnyCheloneI18n, RegisteredTranslate, TranslateFor } from "./i18n";
import {
  defineLocale,
  defineMessages,
  type MessageCatalog,
  type MessageKey,
  type TranslateParams,
  type TranslateParamValues,
} from "./messages";

const messages = defineMessages({
  "chelone.action.save": "Save",
  "chelone.greeting": "Hello {name}, you have {count} items",
  "chelone.notification.deleted": {
    one: "1 element deleted",
    other: "{smart_count} elements deleted",
  },
  "chelone.items": { one: "1 element", other: "{smart_count} elements" },
});
type M = typeof messages;

declare const i18n: AnyCheloneI18n;
declare const translate: RegisteredTranslate;
declare const catalogTranslate: TranslateFor<M>;

describe("i18n type machinery", () => {
  it("keys are a literal union", () => {
    expectTypeOf<MessageKey<M>>().toEqualTypeOf<
      | "chelone.action.save"
      | "chelone.greeting"
      | "chelone.notification.deleted"
      | "chelone.items"
    >();
  });

  it("plain message without placeholders needs no params", () => {
    expectTypeOf<
      TranslateParams<M["chelone.action.save"]>
    >().toEqualTypeOf<undefined>();
  });

  it("placeholders infer required param names", () => {
    expectTypeOf<TranslateParams<M["chelone.greeting"]>>().toEqualTypeOf<{
      name: string | number;
      count: string | number;
    }>();
  });

  it("a plural takes its count under `count` or under `smart_count`", () => {
    type Plural = TranslateParams<M["chelone.notification.deleted"]>;
    const count: Plural = { count: 2 };
    const smartCount: Plural = { smart_count: 2 };
    // @ts-expect-error a plural needs a count under one of the two names
    const neither: Plural = {};
    // @ts-expect-error the count is a number, which drives Intl.PluralRules
    const text: Plural = { count: "two" };
    expectTypeOf([count, smartCount, neither, text]).not.toBeNever();
  });

  it("a placeholder-free plural takes the count under either name too", () => {
    const plain = defineMessages({
      "chelone.items": { one: "one item", other: "many items" },
    });
    type PlainPlural = TranslateParams<(typeof plain)["chelone.items"]>;
    const count: PlainPlural = { count: 2 };
    const smartCount: PlainPlural = { smart_count: 2 };
    // @ts-expect-error a plural needs a count under one of the two names
    const neither: PlainPlural = {};
    expectTypeOf([count, smartCount, neither]).not.toBeNever();
  });

  it("the catalog-erased translate takes string or number values only", () => {
    i18n.translate("key", { name: "x", count: 1 });
    // @ts-expect-error a boolean is not a message param
    i18n.translate("key", { flag: true });
  });
});

describe("with no registered catalog", () => {
  it("RegisteredMessages falls back to MessageCatalog", () => {
    expectTypeOf<RegisteredMessages>().toEqualTypeOf<MessageCatalog>();
  });

  it("any key compiles, with optional loose params", () => {
    expectTypeOf(translate("chelone.action.save")).toEqualTypeOf<string>();
    expectTypeOf(
      translate("anything.at.all", { name: "x", _: "Post" }),
    ).toEqualTypeOf<string>();
    // @ts-expect-error a boolean is not a message param
    translate("anything.at.all", { flag: true });
  });
});

describe("TranslateFor over a registered catalog", () => {
  it("a key with no placeholders takes no params", () => {
    expectTypeOf(
      catalogTranslate("chelone.action.save"),
    ).toEqualTypeOf<string>();
  });

  it("a key with placeholders requires every one of them", () => {
    expectTypeOf(
      catalogTranslate("chelone.greeting", { name: "Ada", count: 2 }),
    ).toEqualTypeOf<string>();
    // @ts-expect-error count is a placeholder of this entry
    catalogTranslate("chelone.greeting", { name: "Ada" });
  });

  it("a misspelt param name fails", () => {
    // @ts-expect-error the entry has a `name` placeholder, not `nme`
    catalogTranslate("chelone.greeting", { nme: "Ada", count: 2 });
  });

  it("a plural takes `count` or `smart_count`, and `_` beside either", () => {
    catalogTranslate("chelone.notification.deleted", { count: 1 });
    catalogTranslate("chelone.notification.deleted", { smart_count: 3 });
    catalogTranslate("chelone.notification.deleted", {
      count: 1,
      _: "elements",
    });
    catalogTranslate("chelone.notification.deleted", {
      smart_count: 3,
      _: "elements",
    });
    // @ts-expect-error a plural needs a count under one of the two names
    catalogTranslate("chelone.notification.deleted");
  });

  it("a key the catalog does not hold compiles with loose params", () => {
    expectTypeOf(
      catalogTranslate("demo.dashboard.title", { _: "Dashboard" }),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      catalogTranslate("demo.dashboard.title"),
    ).toEqualTypeOf<string>();
  });

  it("a template key compiles with loose params", () => {
    const key: `resources.${string}.name` = "resources.posts.name";
    expectTypeOf(catalogTranslate(key, { _: "Post" })).toEqualTypeOf<string>();
  });
});

const base = defineMessages({
  "chelone.action.save": "Save",
  "chelone.greeting": "Hello {name}, you have {count} items",
  "chelone.notification.deleted": {
    one: "1 element deleted",
    other: "{smart_count} elements deleted",
  },
});

const complete = defineLocale<typeof base>()({
  "chelone.action.save": "Enregistrer",
  "chelone.greeting": "Bonjour {name}, vous avez {count} objets",
  "chelone.notification.deleted": {
    one: "1 élément supprimé",
    other: "{smart_count} éléments supprimés",
  },
});

describe("defineLocale", () => {
  it("keeps the catalog's own literal type", () => {
    expectTypeOf(
      complete["chelone.action.save"],
    ).toEqualTypeOf<"Enregistrer">();
    expectTypeOf(
      complete["chelone.greeting"],
    ).toEqualTypeOf<"Bonjour {name}, vous avez {count} objets">();
  });

  it("fails on a missing key", () => {
    // @ts-expect-error "chelone.notification.deleted" is in the base catalog
    defineLocale<typeof base>()({
      "chelone.action.save": "Enregistrer",
      "chelone.greeting": "Bonjour {name}, {count}",
    });
  });

  it("fails on an extra key", () => {
    defineLocale<typeof base>()({
      "chelone.action.save": "Enregistrer",
      "chelone.greeting": "Bonjour {name}, {count}",
      "chelone.notification.deleted": { other: "{smart_count} supprimés" },
      // @ts-expect-error no English entry sits under this key
      "chelone.extra": "Extra",
    });
  });

  it("fails on a string where English has a plural", () => {
    defineLocale<typeof base>()({
      "chelone.action.save": "Enregistrer",
      "chelone.greeting": "Bonjour {name}, {count}",
      // @ts-expect-error the English entry is a plural
      "chelone.notification.deleted": "supprimés",
    });
  });

  it("fails on a plural where English has a string", () => {
    defineLocale<typeof base>()({
      // @ts-expect-error the English entry is a string
      "chelone.action.save": { other: "Enregistrer" },
      "chelone.greeting": "Bonjour {name}, {count}",
      "chelone.notification.deleted": { other: "{smart_count} supprimés" },
    });
  });

  it("fails when a string drops a placeholder English has", () => {
    defineLocale<typeof base>()({
      "chelone.action.save": "Enregistrer",
      // @ts-expect-error the English entry interpolates {name} and {count}
      "chelone.greeting": "Bonjour",
      "chelone.notification.deleted": { other: "{smart_count} supprimés" },
    });
  });

  it("fails when a plural `other` drops a placeholder English has", () => {
    defineLocale<typeof base>()({
      "chelone.action.save": "Enregistrer",
      "chelone.greeting": "Bonjour {name}, {count}",
      // @ts-expect-error the English `other` interpolates {smart_count}
      "chelone.notification.deleted": { other: "supprimés" },
    });
  });

  it("a locale catalog feeds createI18n", () => {
    const typed: MessageCatalog = complete;
    expectTypeOf(typed).toEqualTypeOf<MessageCatalog>();
    const params: TranslateParamValues = { name: "Ada" };
    expectTypeOf(params).toEqualTypeOf<TranslateParamValues>();
  });
});
