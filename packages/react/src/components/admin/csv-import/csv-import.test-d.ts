/**
 * `<CsvImport>` takes the record type from its schema: `fields`,
 * `requiredFields` and `mapping` name keys of the record the import creates.
 */

import { describe, it } from "vitest";
import { z } from "zod";
import { CsvImport } from "./csv-import";

const postSchema = z.object({ title: z.string(), views: z.number() });

describe("<CsvImport> field props", () => {
  it("takes the keys of the schema's record", () => {
    CsvImport({
      schema: postSchema,
      fields: ["title"],
      requiredFields: ["title", "views"],
      mapping: { title: "Title" },
    });
  });

  it("rejects a key the schema's record lacks", () => {
    CsvImport({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      fields: ["titel"],
    });
    CsvImport({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      requiredFields: ["titel"],
    });
    CsvImport({
      schema: postSchema,
      // @ts-expect-error "titel" is not a key of { title, views }
      mapping: { titel: "Title" },
    });
  });

  it("takes any string key with no schema", () => {
    CsvImport({
      fields: ["anything"],
      requiredFields: ["anything"],
      mapping: { anything: "Anything" },
    });
  });
});
