/**
 * The Vue `Translate` is the registered catalog's `translate`, and
 * `useTranslate` returns it.
 *
 * The augmentation is global to this package's TypeScript program, so it also
 * types every `translate("chelone.…")` literal in the Vue components against
 * `englishMessages`. `i18n-hooks.test-d.ts` registers the same catalog on the
 * React side; the two files pin different things.
 */
import type {
  englishMessages,
  RegisteredTranslate,
  TranslateParamValues,
} from "@chelone/core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import { type Translate, useTranslate } from "./use-translate";

declare module "@chelone/core" {
  interface Register {
    messages: typeof englishMessages;
  }
}

declare const translate: Translate;

describe("Translate with a registered catalog", () => {
  it("Translate is RegisteredTranslate, and the hook returns it", () => {
    expectTypeOf<Translate>().toEqualTypeOf<RegisteredTranslate>();
    expectTypeOf(useTranslate).returns.toEqualTypeOf<Translate>();
  });

  it("a component option typed as Translate takes a catalog-erased echo", () => {
    // The shape `unknownBlockNode`'s default option declares in `block-nodes.ts`.
    const echo = (key: string, params?: TranslateParamValues): string =>
      params?._?.toString() ?? key;
    assertType<Translate>(echo);
  });

  it("Translate fits a parameter typed as the catalog-erased function", () => {
    const takesLoose = (
      fn: (key: string, params?: TranslateParamValues) => string,
    ): string => fn("chelone.action.save");
    expectTypeOf(takesLoose(translate)).toBeString();
  });

  it("a known key must be passed what its entry interpolates", () => {
    const created: string = translate("chelone.page.create", { name: "Post" });
    expectTypeOf(created).toBeString();
    // @ts-expect-error the entry interpolates {name}
    translate("chelone.page.create");
  });

  it("a plural entry takes its count under either name", () => {
    translate("chelone.action.bulk_actions", { smart_count: 2 });
    translate("chelone.action.bulk_actions", { count: 2 });
  });

  it("a key outside the catalog keeps the loose params arm", () => {
    const label: string = translate("resources.posts.name", {
      _: "Post",
      count: 1,
    });
    expectTypeOf(label).toBeString();
  });
});
