import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  applyCsvMapping,
  csvSchemaFields,
  validateCsvRows,
} from "./validate-rows";

describe("applyCsvMapping", () => {
  it("copies each mapped header's value to its field and skips a field mapped to an empty header", () => {
    const row = { Name: "Ada", Years: "36", Extra: "x" };

    expect(
      applyCsvMapping(row, { name: "Name", age: "Years", note: "" }),
    ).toEqual({ name: "Ada", age: "36" });
  });
});

describe("csvSchemaFields", () => {
  it("lists a zod object's keys and marks those that are not optional as required", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      email: z.string().email(),
    });

    expect(csvSchemaFields(schema)).toEqual({
      fields: ["name", "age", "email"],
      required: ["name", "email"],
    });
  });

  it("returns no fields for a schema without a shape", () => {
    expect(csvSchemaFields(z.string())).toEqual({ fields: [], required: [] });
  });
});

describe("validateCsvRows", () => {
  const mapping = { title: "Title", price: "Price" };

  it('returns the schema output, so z.coerce.number turns "9.99" into 9.99', async () => {
    const schema = z.object({ title: z.string(), price: z.coerce.number() });

    expect(
      await validateCsvRows([{ Title: "Pen", Price: "9.99" }], {
        mapping,
        schema,
      }),
    ).toEqual([{ ok: true, row: { title: "Pen", price: 9.99 } }]);
  });

  it('reports each issue as "path: message" and keeps the mapped row', async () => {
    const schema = z.object({
      title: z.string().min(1, "Required"),
      price: z.number({ invalid_type_error: "Not a number" }),
    });

    expect(
      await validateCsvRows([{ Title: "", Price: "x" }], { mapping, schema }),
    ).toEqual([
      {
        ok: false,
        row: { title: "", price: "x" },
        issues: ["title: Required", "price: Not a number"],
      },
    ]);
  });

  it("reports the message alone when the issue has no path", async () => {
    const schema = z
      .object({ title: z.string() })
      .refine(() => false, "Row rejected");

    const [result] = await validateCsvRows([{ Title: "Pen" }], {
      mapping: { title: "Title" },
      schema,
    });

    expect(result).toMatchObject({ ok: false, issues: ["Row rejected"] });
  });

  it("runs the transform after the mapping and before the schema, with the row index", async () => {
    const calls: Array<[Record<string, unknown>, number]> = [];
    const schema = z.object({ title: z.string(), price: z.number() });

    const results = await validateCsvRows(
      [
        { Title: "Pen", Price: "2" },
        { Title: "Ink", Price: "3" },
      ],
      {
        mapping,
        schema,
        transform: (row, index) => {
          calls.push([row, index]);
          return { ...row, price: Number(row.price) };
        },
      },
    );

    expect(calls).toEqual([
      [{ title: "Pen", price: "2" }, 0],
      [{ title: "Ink", price: "3" }, 1],
    ]);
    expect(results).toEqual([
      { ok: true, row: { title: "Pen", price: 2 } },
      { ok: true, row: { title: "Ink", price: 3 } },
    ]);
  });

  it("marks a row invalid when the transform throws", async () => {
    const results = await validateCsvRows(
      [{ Title: "Pen" }, { Title: "bad" }],
      {
        mapping: { title: "Title" },
        transform: (row) => {
          if (row.title === "bad") throw new Error("Cannot read bad");
          return row;
        },
      },
    );

    expect(results).toEqual([
      { ok: true, row: { title: "Pen" } },
      { ok: false, row: { title: "bad" }, issues: ["Cannot read bad"] },
    ]);
  });

  it("marks only its own row invalid when the schema throws", async () => {
    const schema = z
      .object({ title: z.string() })
      .refine((row) => {
        if (row.title === "bad") throw new Error("Refine blew up");
        return true;
      });

    expect(
      await validateCsvRows([{ Title: "Pen" }, { Title: "bad" }], {
        mapping: { title: "Title" },
        schema,
      }),
    ).toEqual([
      { ok: true, row: { title: "Pen" } },
      { ok: false, row: { title: "bad" }, issues: ["Refine blew up"] },
    ]);
  });

  it("accepts every row when there is no schema", async () => {
    expect(
      await validateCsvRows([{ Title: "Pen" }, { Title: "" }], {
        mapping: { title: "Title" },
      }),
    ).toEqual([
      { ok: true, row: { title: "Pen" } },
      { ok: true, row: { title: "" } },
    ]);
  });
});
