/**
 * `<CsvImport>` takes the record type from its schema: `fields`,
 * `requiredFields` and `mapping` name keys of the record the import creates.
 * The Vue twin of `@chelone/react`'s `csv-import/csv-import.test-d.ts`.
 */

import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { CsvImportProps } from "./csv-import.vue";

const postSchema = z.object({ title: z.string(), views: z.number() });
type Post = z.infer<typeof postSchema>;

/** Infers the record from the schema, as a template binding does. */
declare function props<TRecord>(
  value: CsvImportProps<TRecord>,
): CsvImportProps<TRecord>;

describe("<CsvImport> field props", () => {
  it("takes the keys of the schema's record", () => {
    props({
      schema: postSchema,
      fields: ["title"],
      requiredFields: ["title", "views"],
      mapping: { title: "Title" },
    });
    expectTypeOf<CsvImportProps<Post>["fields"]>().toEqualTypeOf<
      Array<"title" | "views"> | undefined
    >();
  });

  it("rejects a key the schema's record lacks", () => {
    props({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      fields: ["titel"],
    });
    props({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      requiredFields: ["titel"],
    });
    props({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      mapping: { titel: "Title" },
    });
  });

  it("takes any string key with no schema", () => {
    props({
      fields: ["anything"],
      requiredFields: ["anything"],
      mapping: { anything: "Anything" },
    });
  });
});
