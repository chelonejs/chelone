/**
 * `useTranslate` types its keys and params against the registered catalog.
 *
 * The augmentation below is global to this package's TypeScript program, so it
 * is also how every `translate("chelone.…")` literal in the Vue components
 * typechecks against `englishMessages` — the same registration an app writes in
 * its own resources file.
 */
import type { englishMessages } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { Translate, useTranslate } from "./use-translate";

declare module "@chelone/core" {
  interface Register {
    messages: typeof englishMessages;
  }
}

declare const translate: ReturnType<typeof useTranslate>;

/** The key parameter `translate` suggests. */
type KeyParam = Parameters<typeof translate>[0];

describe("useTranslate with a registered catalog", () => {
  it("Translate is the hook's return type", () => {
    expectTypeOf(translate).toEqualTypeOf<Translate>();
  });

  it("the catalog's own keys are literal members of the key parameter", () => {
    expectTypeOf<
      Extract<KeyParam, "chelone.action.save" | "demo.dashboard.title">
    >().toEqualTypeOf<"chelone.action.save">();
  });

  it("a key with no placeholders takes no params", () => {
    expectTypeOf(translate("chelone.action.save")).toEqualTypeOf<string>();
    translate("chelone.page.not_found", { _: "Not found" });
  });

  it("a key with placeholders requires them", () => {
    translate("chelone.page.create", { name: "Post" });
    // @ts-expect-error chelone.page.create interpolates {name}
    translate("chelone.page.create");
    // @ts-expect-error the entry has a `name` placeholder, not `title`
    translate("chelone.page.create", { title: "Post" });
  });

  it("a plural takes its count under `count` or `smart_count`", () => {
    translate("chelone.action.bulk_actions", { smart_count: 3 });
    translate("chelone.action.bulk_actions", { count: 3 });
    // @ts-expect-error a plural needs a count under one of the two names
    translate("chelone.action.bulk_actions");
  });

  it("a key the catalog does not hold still compiles", () => {
    translate("demo.dashboard.title");
    translate("resources.posts.name", { _: "Post" });
  });

  it("a template key still compiles", () => {
    const key: `resources.${string}.name` = "resources.posts.name";
    expectTypeOf(translate(key, { _: "Post" })).toEqualTypeOf<string>();
  });

  it("the returned translate fits a catalog-erased function", () => {
    const loose: (
      key: string,
      params?: { [name: string]: string | number },
    ) => string = translate;
    expectTypeOf(loose("chelone.action.save")).toEqualTypeOf<string>();
  });
});
