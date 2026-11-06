/**
 * The number, nullable-boolean and file inputs keep the record and the
 * `source` they are given, so a resource's member types `defaultValue` as the
 * value at the `source` and each `parse` takes the one value its control
 * produces.
 */

import type { FileSelection, SourceValue } from "@chelone/core";
import { defineResources } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createResourceComponentsOf } from "../../../create-resource-components";
import type { FileInputProps } from "./file-input.vue";
import type { NumberInputProps } from "./number-input.vue";

const articleSchema = z.object({
  headline: z.string(),
  reads: z.number(),
  live: z.boolean(),
  pinned: z.boolean().nullable(),
});

const resources = defineResources({ articles: { schema: articleSchema } });
type Article = z.output<typeof articleSchema>;

const articles = createResourceComponentsOf<typeof resources, "articles">(
  "articles",
);

type NumberInputAtViews = typeof articles.NumberInput<"reads">;
type BooleanInputAtPublished = typeof articles.BooleanInput<"live">;

describe("number, nullable-boolean and file inputs", () => {
  it("articles.NumberInput types defaultValue as the value at its source", () => {
    expectTypeOf<
      Parameters<NumberInputAtViews>[0]["defaultValue"]
    >().toEqualTypeOf<SourceValue<Article, "reads"> | undefined>();
    articles.NumberInput({ source: "reads", defaultValue: 3 });
    articles.NumberInput({
      source: "reads",
      // @ts-expect-error `reads` is a number, not a string
      defaultValue: "3",
    });
  });

  it("articles.BooleanInput types defaultValue as the value at its source", () => {
    expectTypeOf<
      Parameters<BooleanInputAtPublished>[0]["defaultValue"]
    >().toEqualTypeOf<SourceValue<Article, "live"> | undefined>();
    articles.BooleanInput({ source: "live", defaultValue: true });
    articles.BooleanInput({
      source: "live",
      // @ts-expect-error `live` is a boolean, not a string
      defaultValue: "yes",
    });
  });

  it("NumberInput parse takes the typed string the control produced", () => {
    articles.NumberInput({
      source: "reads",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return Number(value);
      },
    });
  });

  it("NullableBooleanInput parse takes the select's string", () => {
    articles.NullableBooleanInput({
      source: "pinned",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value === "true" ? true : null;
      },
    });
  });

  it("FileInput parse takes the files the dropzone holds", () => {
    articles.FileInput({
      source: "headline",
      parse: (value) => {
        expectTypeOf(value).toEqualTypeOf<FileSelection>();
        return "";
      },
    });
  });

  it("rejects a source the record lacks", () => {
    // @ts-expect-error `readz` is no path of an article
    articles.NumberInput({ source: "readz" });
    // @ts-expect-error `readz` is no path of an article
    articles.BooleanInput({ source: "readz" });
    // @ts-expect-error `readz` is no path of an article
    articles.NullableBooleanInput({ source: "readz" });
    // @ts-expect-error `readz` is no path of an article
    articles.FileInput({ source: "readz" });
  });
});

describe("the number and file input SFCs are generic in their record and source", () => {
  it("each props type holds the source literal and the value at it", () => {
    expectTypeOf<
      NumberInputProps<Article, "reads">["source"]
    >().toEqualTypeOf<"reads">();
    expectTypeOf<
      FileInputProps<Article, "headline">["source"]
    >().toEqualTypeOf<"headline">();
    expectTypeOf<
      NumberInputProps<Article, "reads">["defaultValue"]
    >().not.toBeUnknown();
    expectTypeOf<
      FileInputProps<Article, "headline">["defaultValue"]
    >().not.toBeUnknown();
  });

  it("each props type rejects a default of another type", () => {
    const number: NumberInputProps<Article, "reads"> = {
      source: "reads",
      // @ts-expect-error `reads` is a number, not a string
      defaultValue: "3",
    };
    const file: FileInputProps<Article, "headline"> = {
      source: "headline",
      // @ts-expect-error `headline` is a string, not a number
      defaultValue: 3,
    };
    void [number, file];
  });
});
