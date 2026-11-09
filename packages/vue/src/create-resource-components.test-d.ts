/**
 * What a `posts` view sees in Vue. `createResourceComponentsOf` takes the
 * resource map as a type argument, so no `Register` augmentation is needed
 * (it is global to a TypeScript program). React twin:
 * `resource/create-resource-components.test-d.ts`.
 */
import { defineResources, type LooseRecord } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { CreateProps } from "./components/admin/view/create.vue";
import type { EditProps } from "./components/admin/view/edit.vue";
import { createResourceComponentsOf } from "./create-resource-components";

const catalog = defineResources({
  articles: {
    schema: z.object({
      headline: z.string(),
      reads: z.number(),
    }),
  },
  notes: { schema: z.object({ text: z.string() }) },
});

type Article = z.output<(typeof catalog)["articles"]["schema"]>;

const articles = createResourceComponentsOf<typeof catalog, "articles">(
  "articles",
);

describe("articles.Create and articles.Edit", () => {
  it("articles.Create hands onSuccess and validate the record", () => {
    articles.Create({
      onSuccess: (saved) => {
        expectTypeOf(saved).toEqualTypeOf<Article>();
      },
      validate: (values) => {
        expectTypeOf(values).toEqualTypeOf<Partial<Article>>();
        return undefined;
      },
    });
  });

  it("articles.Edit hands onSuccess the record", () => {
    articles.Edit({
      onSuccess: (saved) => {
        expectTypeOf(saved).toEqualTypeOf<Article>();
      },
    });
  });

  it("a Create record seed is a partial Article", () => {
    articles.Create({ record: { headline: "Hello" } });
    // @ts-expect-error `reads` is a number
    articles.Create({ record: { reads: "many" } });
    // @ts-expect-error `title` is no field of an article
    articles.Create({ record: { title: "Hello" } });
  });

  it("a bound view takes no resource", () => {
    // @ts-expect-error `resource` is bound by the factory
    articles.Create({ resource: "notes" });
    // @ts-expect-error `resource` is bound by the factory
    articles.Edit({ resource: "notes" });
  });

  it("a bare Create and Edit keep the loose record", () => {
    type CreateSaved = Parameters<NonNullable<CreateProps["onSuccess"]>>[0];
    type EditSaved = Parameters<NonNullable<EditProps["onSuccess"]>>[0];
    expectTypeOf<CreateSaved>().toEqualTypeOf<LooseRecord>();
    expectTypeOf<EditSaved>().toEqualTypeOf<LooseRecord>();
    expectTypeOf<CreateProps["record"]>().toEqualTypeOf<
      Partial<LooseRecord> | undefined
    >();
  });
});

describe("an articles bundle's reference components", () => {
  it("reference is a name of the map and target a key of that resource's record", () => {
    articles.ReferenceManyField({ reference: "notes", target: "text" });
    articles.ReferenceOneField({ reference: "notes", target: "text" });
    articles.ReferenceField({ source: "headline", reference: "notes" });
    articles.ReferenceArrayField({ source: "headline", reference: "notes" });
    articles.ReferenceInput({ source: "headline", reference: "notes" });
    articles.ReferenceArrayInput({ source: "headline", reference: "notes" });
  });

  it("a reference name or target the map lacks does not compile", () => {
    // @ts-expect-error `nope` is no resource
    articles.ReferenceManyField({ reference: "nope", target: "text" });
    // @ts-expect-error `headline` is a key of an article, not of a note
    articles.ReferenceManyField({ reference: "notes", target: "headline" });
    // @ts-expect-error `nope` is no key of a note
    articles.ReferenceOneField({ reference: "notes", target: "nope" });
    // @ts-expect-error `typo` is no resource
    articles.ReferenceField({ source: "headline", reference: "typo" });
    // @ts-expect-error `typo` is no resource
    articles.ReferenceArrayField({ source: "headline", reference: "typo" });
    // @ts-expect-error `typo` is no resource
    articles.ReferenceInput({ source: "headline", reference: "typo" });
    // @ts-expect-error `typo` is no resource
    articles.ReferenceArrayInput({ source: "headline", reference: "typo" });
  });

  it("source stays typed by the articles record", () => {
    // @ts-expect-error `titel` is no path of an article
    articles.ReferenceField({ source: "titel", reference: "notes" });
  });
});
