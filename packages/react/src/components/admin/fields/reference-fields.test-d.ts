/**
 * `reference` and `target` on the React reference components, typed against a
 * resource map. Like `createResourceComponentsOf`, the map is a type argument, so
 * these tests need no `Register` augmentation, which is global to a TypeScript
 * program. TypeScript takes all type arguments or none, so each call names the
 * record, the map and the reference.
 */

import {
  defineResources,
  type LooseRecord,
  type RecordOf,
  type ReferenceTargetOf,
  type RegisteredResourceName,
  type SourceKey,
  type SourceProp,
} from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  ReferenceArrayInput,
  type ReferenceArrayInputProps,
} from "../inputs/reference-array-input";
import {
  ReferenceInput,
  type ReferenceInputProps,
} from "../inputs/reference-input";
import {
  ReferenceArrayField,
  type ReferenceArrayFieldProps,
} from "./reference-array-field";
import { ReferenceField, type ReferenceFieldProps } from "./reference-field";
import {
  ReferenceManyField,
  type ReferenceManyFieldProps,
} from "./reference-many-field";
import {
  ReferenceOneField,
  type ReferenceOneFieldProps,
} from "./reference-one-field";

const library = defineResources({
  books: {
    schema: z.object({
      id: z.number(),
      isbn: z.string(),
      writer_id: z.number(),
      quote_ids: z.array(z.number()),
    }),
  },
  writers: { schema: z.object({ id: z.number(), pen_name: z.string() }) },
  quotes: {
    schema: z.object({ id: z.number(), book_id: z.number(), line: z.string() }),
  },
});

type Book = RecordOf<typeof library, "books">;
type Quote = RecordOf<typeof library, "quotes">;
type QuoteTarget = ReferenceTargetOf<typeof library, "quotes">;

const book: Book = {
  id: 1,
  isbn: "9781234567897",
  writer_id: 7,
  quote_ids: [1, 2],
};

/**
 * What an app with `Register` augmented sees: the map is fixed by the app and
 * only the name is inferred, so `target` follows the name with no type argument
 * written at the call.
 */
declare function quoteField<TName extends keyof typeof library & string>(
  props: ReferenceManyFieldProps<LooseRecord, typeof library, TName>,
): void;

describe("with nothing registered", () => {
  it("reference and target fall back to string", () => {
    expectTypeOf<
      ReferenceFieldProps["reference"]
    >().toEqualTypeOf<RegisteredResourceName>();
    expectTypeOf<ReferenceFieldProps["reference"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceManyFieldProps["reference"]
    >().toEqualTypeOf<string>();
    expectTypeOf<ReferenceManyFieldProps["target"]>().toEqualTypeOf<string>();
    expectTypeOf<ReferenceOneFieldProps["target"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceArrayFieldProps["reference"]
    >().toEqualTypeOf<string>();
    expectTypeOf<ReferenceInputProps["reference"]>().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceArrayInputProps["reference"]
    >().toEqualTypeOf<string>();
  });

  it("source stays a SourceProp of the record", () => {
    expectTypeOf<ReferenceFieldProps["source"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<ReferenceManyFieldProps["source"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<ReferenceInputProps["source"]>().toEqualTypeOf<SourceProp>();
  });

  it("any name and any target compile", () => {
    ReferenceField({ source: "writer_id", reference: "whoever" });
    ReferenceManyField({
      reference: "whoever",
      target: "some_column",
      source: "writer.pen_name",
    });
    ReferenceOneField({ reference: "whoever", target: "some_column" });
    ReferenceArrayField({ source: "quote_ids", reference: "whoever" });
    ReferenceInput({ source: "writer_id", reference: "whoever" });
    ReferenceArrayInput({ source: "quote_ids", reference: "whoever" });
  });
});

describe("with a resource map", () => {
  it("reference is a name of the map", () => {
    expectTypeOf<
      ReferenceFieldProps<LooseRecord, typeof library>["reference"]
    >().toEqualTypeOf<"books" | "writers" | "quotes">();
    expectTypeOf<
      ReferenceManyFieldProps<LooseRecord, typeof library>["reference"]
    >().toEqualTypeOf<"books" | "writers" | "quotes">();
    expectTypeOf<
      ReferenceArrayInputProps<LooseRecord, typeof library>["reference"]
    >().toEqualTypeOf<"books" | "writers" | "quotes">();
  });

  it("target is a key of the referenced resource's record", () => {
    expectTypeOf<QuoteTarget>().toEqualTypeOf<SourceKey<Quote>>();
    expectTypeOf<QuoteTarget>().toEqualTypeOf<"id" | "book_id" | "line">();
    expectTypeOf<
      ReferenceOneFieldProps<LooseRecord, typeof library, "writers">["target"]
    >().toEqualTypeOf<"id" | "pen_name">();
  });

  it("a reference the map does not have is a type error", () => {
    ReferenceField<LooseRecord, typeof library, "writers">({
      source: "writer_id",
      reference: "writers",
    });
    ReferenceField<LooseRecord, typeof library, "writers">({
      source: "writer_id",
      // @ts-expect-error "tags" is no resource of the map
      reference: "tags",
    });
    ReferenceArrayInput<LooseRecord, typeof library, "quotes">({
      source: "quote_ids",
      // @ts-expect-error "quote_ids" is a book field, not a resource
      reference: "quote_ids",
    });
  });

  it("a target the referenced record does not have is a type error", () => {
    ReferenceManyField<LooseRecord, typeof library, "quotes">({
      reference: "quotes",
      target: "book_id",
    });
    ReferenceManyField<LooseRecord, typeof library, "quotes">({
      reference: "quotes",
      // @ts-expect-error "bookid" is no key of a quote
      target: "bookid",
    });
    ReferenceOneField<LooseRecord, typeof library, "quotes">({
      reference: "quotes",
      // @ts-expect-error "isbn" is a key of a book, not of a quote
      target: "isbn",
    });
  });

  it("the reference name is inferred from the reference prop", () => {
    quoteField({ reference: "quotes", target: "line" });
    quoteField({
      reference: "quotes",
      // @ts-expect-error "lien" is no key of a quote
      target: "lien",
    });
    quoteField({
      // @ts-expect-error "quots" is no resource of the map
      reference: "quots",
      target: "id",
    });
  });

  it("source stays a path of the current record", () => {
    expectTypeOf<ReferenceFieldProps<Book>["source"]>().toEqualTypeOf<
      SourceProp<Book>
    >();
    ReferenceField<Book, typeof library, "writers">({
      source: "writer_id",
      reference: "writers",
      record: book,
    });
    ReferenceField<Book, typeof library, "writers">({
      // @ts-expect-error "writerid" is no path of a book
      source: "writerid",
      reference: "writers",
      record: book,
    });
    ReferenceManyField<Book, typeof library, "quotes">({
      reference: "quotes",
      // @ts-expect-error "bookid" is no key of a quote
      target: "bookid",
      source: "isbn",
      record: book,
    });
  });
});
