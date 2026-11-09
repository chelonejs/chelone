import { describe, expectTypeOf, it } from "vitest";
import type { Register, RegisteredLiteralMessages } from "../resource/register";
import type { RegisteredTranslate, TranslateFor } from "./i18n";
import { defineLocale, defineMessages } from "./messages";

const en = defineMessages({
  "chelone.action.save": "Save",
  "app.greeting": "Hello {name}",
  "app.items": { one: "1 element", other: "{smart_count} elements" },
  "app.plain": { one: "1 element", other: "many elements" },
  "resources.posts.name": "Post",
});

const fr = defineLocale<typeof en>()({
  "chelone.action.save": "Enregistrer",
  "app.greeting": "Bonjour {name}",
  "app.items": { one: "1 élément", other: "{smart_count} éléments" },
  "app.plain": { one: "1 élément", other: "plusieurs éléments" },
  "resources.posts.name": "Article",
});

/** The registered list: `messages: typeof en | typeof fr`. */
type Catalog = typeof en | typeof fr;

/** The flag, as an app writes it: `interface Register { literalMessages: true }`. */
interface LiteralRegister extends Register {
  literalMessages: true;
}

/**
 * `TranslateFor` defaults its register shape to the real `Register`, so
 * `registered` is the no-flag case and `literal` the flag on, with no program
 * augmented: augmenting `literalMessages: true` here would turn every
 * component's return into a union.
 */
declare const registered: TranslateFor<Catalog>;
declare const literal: TranslateFor<Catalog, LiteralRegister>;
declare const translate: RegisteredTranslate;

declare const nameText: string;
declare const nameNumber: number;
declare const flag: boolean;

/** A catalog imported from JSON: a JSON import's values arrive as `string`. */
declare const jsonMessages: {
  "chelone.action.save": string;
  "app.greeting": string;
};
declare const fromJson: TranslateFor<typeof jsonMessages, LiteralRegister>;

describe("with no literalMessages flag", () => {
  it("the real Register asks for no literal text", () => {
    expectTypeOf<RegisteredLiteralMessages>().toEqualTypeOf<false>();
  });

  it("a known key returns string", () => {
    expectTypeOf(registered("chelone.action.save")).toEqualTypeOf<string>();
  });

  it("an unknown key returns string", () => {
    expectTypeOf(registered("app.nope", { _: "Nope" })).toEqualTypeOf<string>();
  });

  it("a plural key returns string", () => {
    expectTypeOf(registered("app.items", { count: 2 })).toEqualTypeOf<string>();
  });

  it("the registered translate returns string", () => {
    expectTypeOf(translate("chelone.action.save")).toEqualTypeOf<string>();
    expectTypeOf(
      translate("app.items", { smart_count: 2 }),
    ).toEqualTypeOf<string>();
  });
});

describe("with literalMessages: true", () => {
  it("a plain key returns its text from every registered locale", () => {
    expectTypeOf(literal("chelone.action.save")).toEqualTypeOf<
      "Save" | "Enregistrer"
    >();
  });

  it("a placeholder takes the type of the param passed for it", () => {
    expectTypeOf(literal("app.greeting", { name: "Ann" })).toEqualTypeOf<
      "Hello Ann" | "Bonjour Ann"
    >();
    expectTypeOf(literal("app.greeting", { name: 3 })).toEqualTypeOf<
      "Hello 3" | "Bonjour 3"
    >();
    expectTypeOf(literal("app.greeting", { name: nameText })).toEqualTypeOf<
      `Hello ${string}` | `Bonjour ${string}`
    >();
    expectTypeOf(literal("app.greeting", { name: nameNumber })).toEqualTypeOf<
      `Hello ${number}` | `Bonjour ${number}`
    >();
  });

  it("a plural returns every form of every locale, whatever the count is", () => {
    expectTypeOf(literal("app.plain", { count: 1 })).toEqualTypeOf<
      "1 element" | "many elements" | "1 élément" | "plusieurs éléments"
    >();
    expectTypeOf(literal("app.plain", { count: 4 })).toEqualTypeOf<
      "1 element" | "many elements" | "1 élément" | "plusieurs éléments"
    >();
    expectTypeOf(literal("app.plain", { smart_count: 4 })).toEqualTypeOf<
      "1 element" | "many elements" | "1 élément" | "plusieurs éléments"
    >();
  });

  it("a plural fills its count placeholder under either name", () => {
    expectTypeOf(literal("app.items", { count: nameNumber })).toEqualTypeOf<
      "1 element" | `${number} elements` | "1 élément" | `${number} éléments`
    >();
    expectTypeOf(
      literal("app.items", { smart_count: nameNumber }),
    ).toEqualTypeOf<
      "1 element" | `${number} elements` | "1 élément" | `${number} éléments`
    >();
  });

  it("a key no catalog holds returns string", () => {
    expectTypeOf(literal("app.nope")).toEqualTypeOf<string>();
    expectTypeOf(
      literal("app.nope", { _: "Nope", name: "Ann" }),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      literal(`resources.${"comments"}.name`, { _: "Post" }),
    ).toEqualTypeOf<string>();
  });

  it("a template key the catalogs hold keeps its text union", () => {
    expectTypeOf(literal(`resources.${"posts"}.name`)).toEqualTypeOf<
      "Post" | "Article"
    >();
  });

  it("a key that is known and unknown at once returns string", () => {
    // the unknown member answers with the key echo or its `_` default, so the
    // known members' text alone would be a type the value can never have
    expectTypeOf(
      literal(flag ? "chelone.action.save" : "app.nope"),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      literal(flag ? "chelone.action.save" : "app.nope", { _: "Nope" }),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      literal(`resources.${flag ? "posts" : "comments"}.name`, { _: "Post" }),
    ).toEqualTypeOf<string>();
    expectTypeOf(literal(nameText)).toEqualTypeOf<string>();
  });

  it("a catalog imported from JSON returns string", () => {
    // a widened value names no placeholder, so only `_` is a param it takes
    expectTypeOf(fromJson("chelone.action.save")).toEqualTypeOf<string>();
    expectTypeOf(
      fromJson("app.greeting", { _: "Hello" }),
    ).toEqualTypeOf<string>();
    expectTypeOf(
      fromJson("app.anything", { _: "Anything" }),
    ).toEqualTypeOf<string>();
  });

  it("the flag leaves the params contract alone", () => {
    // @ts-expect-error the entry interpolates {name}
    literal("app.greeting");
    // @ts-expect-error the entry has a `name` placeholder, not `nme`
    literal("app.greeting", { nme: "Ann" });
    // @ts-expect-error a plural needs a count under `count` or `smart_count`
    literal("app.items");
    // @ts-expect-error a param is a string or a number
    literal("app.greeting", { name: true });
  });
});
