import { describe, expect, it } from "vitest";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { describeResource } from "./describe-resource";

const fieldsOf = (shape: z.ZodRawShape, references?: Record<string, string>) =>
  describeResource("things", { schema: z.object(shape), references })?.fields;

const fieldsOf4 = (
  shape: Parameters<typeof z4.object>[0],
  references?: Record<string, string>,
) =>
  describeResource("things", { schema: z4.object(shape), references })?.fields;

const only = (schema: z4.core.$ZodType) => fieldsOf({ value: schema })?.[0];

/**
 * A schema whose def is not the shape a real Zod def has. Only `~standard` is
 * real, and `describeResource` never reads it.
 */
const brokenSchema = (def: { _def?: object; _zod?: object }) => ({
  ...def,
  "~standard": {
    version: 1 as const,
    vendor: "fake",
    validate: () => ({ value: undefined }),
  },
});

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
      record: z.record(z.string(), z.string()),
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

describe("describeResource with a Zod 4 schema", () => {
  it("describes a Zod 4 object the same as its Zod 3 equivalent", () => {
    const zod3 = z.object({
      id: z.number(),
      title: z.string(),
      subtitle: z.string().optional(),
      note: z.string().nullable(),
      status: z.string().default("draft"),
      mail: z.string().email(),
      site: z.string().url().optional(),
      views: z.number(),
      live: z.boolean(),
      publishedAt: z.date(),
      kind: z.enum(["news", "blog"]),
      tags: z.array(z.string()),
    });
    const zod4 = z4.object({
      id: z4.number(),
      title: z4.string(),
      subtitle: z4.string().optional(),
      note: z4.string().nullable(),
      status: z4.string().default("draft"),
      mail: z4.string().email(),
      site: z4.string().url().optional(),
      views: z4.number(),
      live: z4.boolean(),
      publishedAt: z4.date(),
      kind: z4.enum(["news", "blog"]),
      tags: z4.array(z4.string()),
    });
    const expected = describeResource("posts", { schema: zod3 });
    expect(expected?.fields.map((f) => f.kind)).toEqual([
      "number",
      "text",
      "text",
      "text",
      "text",
      "email",
      "url",
      "number",
      "boolean",
      "date",
      "select",
      "textArray",
    ]);
    expect(describeResource("posts", { schema: zod4 })).toEqual(expected);
  });

  it("reads Zod 4 format schemas, dates and datetimes", () => {
    const kinds = fieldsOf4({
      mail: z4.email(),
      site: z4.url(),
      day: z4.iso.date(),
      moment: z4.iso.datetime(),
      legacyMoment: z4.string().datetime(),
    })?.map((f) => f.kind);
    expect(kinds).toEqual(["email", "url", "date", "dateTime", "dateTime"]);
  });

  it("unwraps Zod 4 catch, readonly, nonoptional, pipe and preprocess", () => {
    const kinds = fieldsOf4({
      caught: z4.string().catch("x"),
      readonly: z4.string().readonly(),
      required: z4.string().optional().nonoptional(),
      piped: z4.string().pipe(z4.string().min(1)),
      transformed: z4.string().transform((v) => v.length),
      preprocessed: z4.preprocess((v) => String(v), z4.string()),
    })?.map((f) => f.kind);
    expect(kinds).toEqual(Array(6).fill("text"));
  });

  it("turns a Zod 4 enum, native enum and literal union into select choices", () => {
    enum Priority {
      Low,
      High,
    }
    const fields = fieldsOf4({
      plain: z4.enum(["a", "b"]),
      native: z4.nativeEnum(Priority),
      union: z4.union([z4.literal("x"), z4.literal(2)]),
    });
    expect(fields?.map((f) => f.choices)).toEqual([
      [
        { id: "a", name: "a" },
        { id: "b", name: "b" },
      ],
      [
        { id: 0, name: "0" },
        { id: 1, name: "1" },
      ],
      [
        { id: "x", name: "x" },
        { id: 2, name: "2" },
      ],
    ]);
  });

  it("marks Zod 4 object, record, tuple, array and union fields unsupported with the Zod 3 reasons", () => {
    const fields = fieldsOf4({
      object: z4.object({ a: z4.string() }),
      record: z4.record(z4.string(), z4.string()),
      tuple: z4.tuple([z4.string(), z4.number()]),
      objects: z4.array(z4.object({ a: z4.string() })),
      numbers: z4.array(z4.number()),
      bigint: z4.bigint(),
      union: z4.union([z4.string(), z4.number()]),
    });
    expect(fields?.map((f) => f.reason)).toEqual([
      "object schema",
      "record schema",
      "tuple schema",
      "array of objects",
      "array of numbers",
      "bigint schema",
      "union schema",
    ]);
  });

  it("carries Zod 4 describe text as the label and takes references", () => {
    const fields = fieldsOf4(
      {
        title: z4.string().describe("Headline"),
        outer: z4.string().optional().describe("Outer text"),
        authorId: z4.number(),
        tagIds: z4.array(z4.number()).optional(),
      },
      { authorId: "users", tagIds: "tags" },
    );
    expect(fields?.map((f) => [f.label, f.kind, f.reference])).toEqual([
      ["Headline", "text", undefined],
      ["Outer text", "text", undefined],
      [undefined, "reference", "users"],
      [undefined, "referenceArray", "tags"],
    ]);
  });

  it("describes a Zod 4 object wrapped in a refinement", () => {
    const schema = z4
      .object({ id: z4.number(), title: z4.string() })
      .refine((post) => post.title.length > 0);
    expect(
      describeResource("posts", { schema })?.fields.map((f) => f.source),
    ).toEqual(["id", "title"]);
  });

  it("describes a non-Zod Standard Schema as nothing", () => {
    const schema = {
      "~standard": {
        version: 1,
        vendor: "other",
        validate: (value: unknown) => ({ value }),
      },
    } as const;
    expect(describeResource("posts", { schema })).toBeUndefined();
  });
});

describe("describeResource with a def that is not what it claims", () => {
  it("ignores a Zod 3 enum whose values are not an array", () => {
    const schema = brokenSchema({
      _def: {
        typeName: "ZodObject",
        shape: () => ({
          value: { _def: { typeName: "ZodEnum", values: "a,b" } },
        }),
      },
    });
    expect(describeResource("posts", { schema })?.fields[0]).toMatchObject({
      kind: "select",
      choices: [],
    });
  });

  it("ignores a Zod 4 enum whose entries are not a record", () => {
    const schema = brokenSchema({
      _zod: {
        def: {
          type: "object",
          shape: { value: { _zod: { def: { type: "enum", entries: "a,b" } } } },
        },
      },
    });
    expect(describeResource("posts", { schema })?.fields[0]).toMatchObject({
      kind: "select",
      choices: [],
    });
  });
});
