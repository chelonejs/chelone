/**
 * `printGuessedView` tests: the text a guesser prints for a developer to copy.
 * The descriptors come from `describeResource` over a real Zod schema, so the
 * tests read the same shapes the guessers do.
 */

import { defineResources, describeResource } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { printGuessedView } from "./guessed-code";

function fieldsOf(
  shape: z.ZodRawShape,
  references?: Record<string, string>,
  resource = "posts",
) {
  const registry = defineResources({
    [resource]: { schema: z.object(shape), references },
  });
  const described = describeResource(resource, registry[resource]);
  if (!described) throw new Error("schema did not describe");
  return described.fields;
}

const imports = (text: string) =>
  /import \{ ([^}]*) \} from "@chelone\/vue";/.exec(text)?.[1]?.split(", ");

describe("printGuessedView", () => {
  it("prints a List with one DataTableCol per field", () => {
    const text = printGuessedView(
      "List",
      "posts",
      fieldsOf({
        id: z.number(),
        title: z.string(),
        views: z.number(),
        email: z.string().email(),
      }),
    );

    expect(text).toBe(
      [
        'Guessed List for "posts":',
        "",
        '<script setup lang="ts">',
        'import { DataTable, DataTableCol, EmailField, List, NumberField } from "@chelone/vue";',
        "",
        'defineOptions({ name: "PostsList" });',
        "</script>",
        "",
        "<template>",
        "  <List>",
        "    <DataTable>",
        '      <DataTableCol source="id"><NumberField source="id" /></DataTableCol>',
        '      <DataTableCol source="title" />',
        '      <DataTableCol source="views"><NumberField source="views" /></DataTableCol>',
        '      <DataTableCol source="email"><EmailField source="email" /></DataTableCol>',
        "    </DataTable>",
        "  </List>",
        "</template>",
      ].join("\n"),
    );
  });

  it("wraps a reference column in ReferenceField with its reference", () => {
    const text = printGuessedView(
      "List",
      "posts",
      fieldsOf({ author_id: z.number() }, { author_id: "authors" }),
    );

    expect(text).toContain(
      '<DataTableCol source="author_id"><ReferenceField source="author_id" reference="authors" /></DataTableCol>',
    );
  });

  it("carries choices onto a select column", () => {
    const text = printGuessedView(
      "List",
      "posts",
      fieldsOf({ status: z.enum(["draft", "it's"]) }),
    );

    expect(text).toContain(
      `<SelectField source="status" :choices="[{ id: 'draft', name: 'draft' }, { id: 'it\\'s', name: 'it\\'s' }]" />`,
    );
  });

  it("leaves the id out of an Edit and ends it with the Toolbar", () => {
    const text = printGuessedView(
      "Edit",
      "posts",
      fieldsOf({ id: z.number(), title: z.string(), views: z.number() }),
    );

    expect(text).toContain(
      [
        "  <Edit>",
        '    <TextInput source="title" />',
        '    <NumberInput source="views" />',
        "    <Toolbar />",
        "  </Edit>",
      ].join("\n"),
    );
    expect(text).not.toContain('source="id"');
  });

  it("prints a reference input with no child", () => {
    const text = printGuessedView(
      "Edit",
      "posts",
      fieldsOf(
        { author_id: z.number(), tag_ids: z.array(z.string()) },
        { author_id: "authors", tag_ids: "tags" },
      ),
    );

    expect(text).toContain(
      '<ReferenceInput source="author_id" reference="authors" />',
    );
    expect(text).toContain(
      '<ReferenceArrayInput source="tag_ids" reference="tags" />',
    );
  });

  it("prints a select input with its choices", () => {
    const text = printGuessedView(
      "Edit",
      "posts",
      fieldsOf({ level: z.union([z.literal(1), z.literal(2)]) }),
    );

    expect(text).toContain(
      '<SelectInput source="level" :choices="[{ id: 1, name: \'1\' }, { id: 2, name: \'2\' }]" />',
    );
  });

  it("wraps every Show field in RecordField", () => {
    const text = printGuessedView(
      "Show",
      "posts",
      fieldsOf({ id: z.number(), title: z.string(), live: z.boolean() }),
    );

    expect(text).toContain(
      [
        "  <Show>",
        '    <RecordField source="id"><NumberField source="id" /></RecordField>',
        '    <RecordField source="title" />',
        '    <RecordField source="live"><BooleanField source="live" /></RecordField>',
        "  </Show>",
      ].join("\n"),
    );
  });

  it("imports each component once from @chelone/vue, sorted", () => {
    const text = printGuessedView(
      "List",
      "posts",
      fieldsOf({
        views: z.number(),
        likes: z.number(),
        live: z.boolean(),
        title: z.string(),
      }),
    );

    expect(imports(text)).toEqual([
      "BooleanField",
      "DataTable",
      "DataTableCol",
      "List",
      "NumberField",
    ]);
    expect(text.match(/from "@chelone\/vue"/g)).toHaveLength(1);
  });

  it("imports only what an Edit uses", () => {
    const text = printGuessedView(
      "Edit",
      "posts",
      fieldsOf({ id: z.number(), title: z.string() }),
    );

    expect(imports(text)).toEqual(["Edit", "TextInput", "Toolbar"]);
  });

  it("names the component after the PascalCase resource and the view", () => {
    const fields = fieldsOf({ title: z.string() });

    expect(printGuessedView("List", "blog-posts", fields)).toContain(
      'defineOptions({ name: "BlogPostsList" });',
    );
    expect(printGuessedView("Edit", "user_profiles", fields)).toContain(
      'defineOptions({ name: "UserProfilesEdit" });',
    );
    expect(printGuessedView("Show", "posts", fields)).toContain(
      'defineOptions({ name: "PostsShow" });',
    );
  });

  it("lists unsupported fields as skipped after the template", () => {
    const text = printGuessedView(
      "Show",
      "posts",
      fieldsOf({
        title: z.string(),
        meta: z.object({ a: z.string() }),
        tags: z.array(z.object({ a: z.string() })),
      }),
    );

    expect(text.endsWith("</template>\n\nSkipped: meta (object schema)\nSkipped: tags (array of objects)")).toBe(true);
    expect(text).not.toContain('source="meta"');
    expect(text).not.toContain('source="tags"');
  });

  it("prints no Skipped line when every field is supported", () => {
    const text = printGuessedView(
      "List",
      "posts",
      fieldsOf({ title: z.string() }),
    );

    expect(text).not.toContain("Skipped");
    expect(text.endsWith("</template>")).toBe(true);
  });

  it("prints showTime on a dateTime field", () => {
    const fields = fieldsOf({ at: z.string().datetime() });

    expect(printGuessedView("List", "posts", fields)).toContain(
      '<DateField source="at" :showTime="true" />',
    );
    expect(printGuessedView("Show", "posts", fields)).toContain(
      '<RecordField source="at"><DateField source="at" :showTime="true" /></RecordField>',
    );
    expect(printGuessedView("Edit", "posts", fields)).toContain(
      '<DateTimeInput source="at" />',
    );
  });
});
