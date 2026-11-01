import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeResource } from "./describe-resource";

const fieldsOf = (shape: z.ZodRawShape, references?: Record<string, string>) =>
  describeResource("things", { schema: z.object(shape), references })?.fields;

const only = (schema: z.ZodTypeAny) => fieldsOf({ value: schema })?.[0];

describe("describeResource", () => {
  it("returns undefined without a schema and for a schema that is not an object", () => {
    expect(describeResource("posts", undefined)).toBeUndefined();
    expect(describeResource("posts", {})).toBeUndefined();
    expect(describeResource("posts", { schema: z.string() })).toBeUndefined();
    expect(
      describeResource("posts", { schema: z.array(z.object({})) }),
    ).toBeUndefined();
  });

  it("lists fields in schema key order and marks id as primary", () => {
    const descriptor = describeResource("posts", {
      schema: z.object({ title: z.string(), id: z.number(), body: z.string() }),
    });
    expect(descriptor?.resource).toBe("posts");
    expect(descriptor?.fields.map((f) => [f.source, f.primary])).toEqual([
      ["title", false],
      ["id", true],
      ["body", false],
    ]);
  });

  it("maps string, email, url, number and boolean to their field and input names", () => {
    expect(
      fieldsOf({
        name: z.string(),
        mail: z.string().email(),
        site: z.string().url(),
        age: z.number(),
        ok: z.boolean(),
      }),
    ).toEqual([
      {
        source: "name",
        kind: "text",
        primary: false,
        field: "TextField",
        input: "TextInput",
      },
      {
        source: "mail",
        kind: "email",
        primary: false,
        field: "EmailField",
        input: "TextInput",
      },
      {
        source: "site",
        kind: "url",
        primary: false,
        field: "UrlField",
        input: "TextInput",
      },
      {
        source: "age",
        kind: "number",
        primary: false,
        field: "NumberField",
        input: "NumberInput",
      },
      {
        source: "ok",
        kind: "boolean",
        primary: false,
        field: "BooleanField",
        input: "BooleanInput",
      },
    ]);
  });

  it("maps a datetime string to DateField with showTime and DateTimeInput, and dates to DateInput", () => {
    expect(only(z.string().datetime())).toMatchObject({
      kind: "dateTime",
      field: "DateField",
      fieldProps: { showTime: true },
      input: "DateTimeInput",
    });
    for (const schema of [z.string().date(), z.date()]) {
      const described = only(schema);
      expect(described).toMatchObject({
        kind: "date",
        field: "DateField",
        input: "DateInput",
      });
      expect(described?.fieldProps).toBeUndefined();
    }
  });

  it("unwraps optional, nullable, default, catch, readonly, branded, effects and pipeline", () => {
    const wrapped = {
      optional: z.string().optional(),
      nullable: z.string().nullable(),
      withDefault: z.string().default("x"),
      caught: z.string().catch("x"),
      readonly: z.string().readonly(),
      branded: z.string().brand<"Slug">(),
      refined: z.string().refine((v) => v.length > 0),
      transformed: z.string().transform((v) => v.length),
      preprocessed: z.preprocess((v) => String(v), z.string()),
      piped: z.string().pipe(z.string().min(1)),
      stacked: z.string().email().optional().nullable().default(null),
    };
    const fields = fieldsOf(wrapped);
    expect(fields?.map((f) => f.kind)).toEqual([
      ...Object.keys(wrapped)
        .slice(0, -1)
        .map(() => "text"),
      "email",
    ]);
  });

  it("describes an object schema wrapped in refine", () => {
    const schema = z
      .object({ id: z.number(), title: z.string() })
      .refine((post) => post.title.length > 0);
    expect(
      describeResource("posts", { schema })?.fields.map((f) => f.source),
    ).toEqual(["id", "title"]);
  });

  it("turns an enum, a native enum and a literal union into select choices", () => {
    enum Status {
      Draft = "draft",
      Live = "live",
    }
    const expected = (ids: (string | number)[]) => ({
      kind: "select",
      field: "SelectField",
      input: "SelectInput",
      choices: ids.map((id) => ({ id, name: String(id) })),
    });
    expect(only(z.enum(["a", "b"]))).toMatchObject(expected(["a", "b"]));
    expect(only(z.nativeEnum(Status))).toMatchObject(
      expected(["draft", "live"]),
    );
    expect(
      only(z.union([z.literal("x"), z.literal(2), z.literal("z")])),
    ).toMatchObject(expected(["x", 2, "z"]));
  });

  it("drops the reverse keys of a numeric native enum", () => {
    enum Priority {
      Low,
      High,
    }
    expect(only(z.nativeEnum(Priority))?.choices).toEqual([
      { id: 0, name: "0" },
      { id: 1, name: "1" },
    ]);
  });

  it("maps an array of strings to textArray", () => {
    expect(only(z.array(z.string()))).toMatchObject({
      kind: "textArray",
      field: "TextArrayField",
      input: "TextArrayInput",
    });
  });

  it("marks object, record, tuple and array of objects unsupported with a reason", () => {
    const fields = fieldsOf({
      object: z.object({ a: z.string() }),
      record: z.record(z.string()),
      tuple: z.tuple([z.string(), z.number()]),
      objects: z.array(z.object({ a: z.string() })),
      numbers: z.array(z.number()),
      bigint: z.bigint(),
      union: z.union([z.string(), z.number()]),
    });
    expect(fields?.map((f) => [f.kind, f.reason, f.field, f.input])).toEqual([
      ["unsupported", "object schema", undefined, undefined],
      ["unsupported", "record schema", undefined, undefined],
      ["unsupported", "tuple schema", undefined, undefined],
      ["unsupported", "array of objects", undefined, undefined],
      ["unsupported", "array of numbers", undefined, undefined],
      ["unsupported", "bigint schema", undefined, undefined],
      ["unsupported", "union schema", undefined, undefined],
    ]);
  });

  it("takes a reference from config.references and never from a field name", () => {
    const fields = fieldsOf(
      { author: z.string(), authorId: z.string(), user_id: z.number() },
      { author: "users" },
    );
    expect(fields?.[0]).toEqual({
      source: "author",
      kind: "reference",
      primary: false,
      field: "ReferenceField",
      input: "ReferenceInput",
      reference: "users",
    });
    expect(fields?.slice(1).map((f) => [f.kind, f.reference])).toEqual([
      ["text", undefined],
      ["number", undefined],
    ]);
  });

  it("turns a references entry on an array into referenceArray", () => {
    const fields = fieldsOf(
      { tagIds: z.array(z.number()).optional() },
      { tagIds: "tags" },
    );
    expect(fields?.[0]).toEqual({
      source: "tagIds",
      kind: "referenceArray",
      primary: false,
      field: "ReferenceArrayField",
      input: "ReferenceArrayInput",
      reference: "tags",
    });
  });

  it("carries describe text as the label", () => {
    const fields = fieldsOf({
      plain: z.string(),
      inner: z.string().describe("Headline"),
      outer: z.string().optional().describe("Outer text"),
      both: z.string().describe("Inner text").nullable().describe("Outer text"),
    });
    expect(fields?.map((f) => f.label)).toEqual([
      undefined,
      "Headline",
      "Outer text",
      "Outer text",
    ]);
    expect(fields?.[0]).not.toHaveProperty("label");
  });
});
