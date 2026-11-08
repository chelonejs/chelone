import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { DataProvider } from "../data/types";
import { createCsvImportController } from "./import-controller";
import type { CsvImportState, CsvRow } from "./types";

const postSchema = z.object({ title: z.string(), views: z.number() });

/** A provider with no runtime behind it: a type test only passes it along. */
declare const dataProvider: DataProvider;

describe("createCsvImportController", () => {
  it("takes the keys of the schema's record", () => {
    createCsvImportController({
      dataProvider,
      resource: "posts",
      schema: postSchema,
      fields: ["title"],
      requiredFields: ["title", "views"],
      mapping: { title: "Title" },
    });
  });

  it("rejects a key the schema's record lacks", () => {
    createCsvImportController({
      dataProvider,
      resource: "posts",
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      fields: ["titel"],
    });
    createCsvImportController({
      dataProvider,
      resource: "posts",
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      requiredFields: ["titel"],
    });
    createCsvImportController({
      dataProvider,
      resource: "posts",
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      mapping: { titel: "Title" },
    });
  });

  it("takes any string key with no schema", () => {
    createCsvImportController({
      dataProvider,
      resource: "posts",
      fields: ["anything"],
      requiredFields: ["anything"],
      mapping: { anything: "Anything" },
    });
  });

  it("leaves the wizard's runtime view string-keyed", () => {
    expectTypeOf<CsvImportState["fields"]>().toEqualTypeOf<string[]>();
    expectTypeOf<CsvImportState["requiredFields"]>().toEqualTypeOf<string[]>();
    expectTypeOf<CsvImportState["mapping"]>().toEqualTypeOf<
      Record<string, string>
    >();
    expectTypeOf<keyof CsvRow>().toEqualTypeOf<string>();
    expectTypeOf<CsvRow[string]>().toBeUnknown();
  });
});
