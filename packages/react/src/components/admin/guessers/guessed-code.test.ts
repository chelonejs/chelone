import type { FieldDescriptor } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { printGuessedView } from "./guessed-code";

const id: FieldDescriptor = {
  source: "id",
  kind: "text",
  primary: true,
  field: "TextField",
  input: "TextInput",
};
const title: FieldDescriptor = {
  source: "title",
  kind: "text",
  primary: false,
  field: "TextField",
  input: "TextInput",
};
const published: FieldDescriptor = {
  source: "published",
  kind: "boolean",
  primary: false,
  field: "BooleanField",
  input: "BooleanInput",
};
const authorId: FieldDescriptor = {
  source: "authorId",
  kind: "reference",
  primary: false,
  field: "ReferenceField",
  input: "ReferenceInput",
  reference: "users",
};
const status: FieldDescriptor = {
  source: "status",
  kind: "select",
  primary: false,
  field: "SelectField",
  input: "SelectInput",
  choices: [
    { id: "draft", name: "draft" },
    { id: 2, name: "2" },
  ],
};
const publishedAt: FieldDescriptor = {
  source: "publishedAt",
  kind: "dateTime",
  primary: false,
  field: "DateField",
  input: "DateTimeInput",
  fieldProps: { showTime: true },
};
const meta: FieldDescriptor = {
  source: "meta",
  kind: "unsupported",
  primary: false,
  reason: "record schema",
};

describe("printGuessedView", () => {
  it("prints a List with one DataTable.Col per field", () => {
    expect(printGuessedView("List", "posts", [id, title, published])).toBe(
      [
        'Guessed List for "posts":',
        "",
        'import { BooleanField, DataTable, List } from "@chelone/react";',
        "",
        "export const PostsList = () => (",
        "  <List>",
        "    <DataTable>",
        '      <DataTable.Col source="id" />',
        '      <DataTable.Col source="title" />',
        '      <DataTable.Col source="published">',
        '        <BooleanField source="published" />',
        "      </DataTable.Col>",
        "    </DataTable>",
        "  </List>",
        ");",
      ].join("\n"),
    );
  });

  it("wraps a reference column in ReferenceField with its reference", () => {
    const code = printGuessedView("List", "posts", [authorId]);
    expect(code).toContain(
      '<ReferenceField source="authorId" reference="users" />',
    );
    expect(code).toContain('<DataTable.Col source="authorId">');
  });

  it("carries choices and fieldProps onto the field component", () => {
    const code = printGuessedView("List", "posts", [status, publishedAt]);
    expect(code).toContain(
      '<SelectField source="status" choices={[{ id: "draft", name: "draft" }, { id: 2, name: "2" }]} />',
    );
    expect(code).toContain('<DateField source="publishedAt" showTime />');
  });

  it("prints showTime on a dateTime field", () => {
    for (const view of ["List", "Show"] as const) {
      expect(printGuessedView(view, "posts", [publishedAt])).toContain(
        '<DateField source="publishedAt" showTime />',
      );
    }
  });

  it("leaves the id out of an Edit and ends it with the Toolbar", () => {
    expect(printGuessedView("Edit", "posts", [id, title, published])).toBe(
      [
        'Guessed Edit for "posts":',
        "",
        'import { BooleanInput, Edit, TextInput, Toolbar } from "@chelone/react";',
        "",
        "export const PostsEdit = () => (",
        "  <Edit>",
        '    <TextInput source="title" />',
        '    <BooleanInput source="published" />',
        "    <Toolbar />",
        "  </Edit>",
        ");",
      ].join("\n"),
    );
  });

  it("wraps a reference input in ReferenceInput with an AutocompleteInput", () => {
    const code = printGuessedView("Edit", "posts", [authorId]);
    expect(code).toContain(
      [
        '    <ReferenceInput source="authorId" reference="users">',
        "      <AutocompleteInput />",
        "    </ReferenceInput>",
      ].join("\n"),
    );
    expect(code).toContain("AutocompleteInput");
    expect(code.split("\n")[2]).toBe(
      'import { AutocompleteInput, Edit, ReferenceInput, Toolbar } from "@chelone/react";',
    );
  });

  it("puts a reference's label on the AutocompleteInput child", () => {
    const code = printGuessedView("Edit", "posts", [
      { ...authorId, label: "Author" },
    ]);
    expect(code).toContain(
      [
        '    <ReferenceInput source="authorId" reference="users">',
        '      <AutocompleteInput label="Author" />',
        "    </ReferenceInput>",
      ].join("\n"),
    );
  });

  it("puts a referenceArray's label on an AutocompleteArrayInput child", () => {
    const tagIds: FieldDescriptor = {
      source: "tagIds",
      kind: "referenceArray",
      primary: false,
      field: "ReferenceArrayField",
      input: "ReferenceArrayInput",
      reference: "tags",
    };
    expect(printGuessedView("Edit", "posts", [tagIds])).toContain(
      '<ReferenceArrayInput source="tagIds" reference="tags" />',
    );
    const code = printGuessedView("Edit", "posts", [
      { ...tagIds, label: "Tags" },
    ]);
    expect(code).toContain(
      [
        '    <ReferenceArrayInput source="tagIds" reference="tags">',
        '      <AutocompleteArrayInput label="Tags" />',
        "    </ReferenceArrayInput>",
      ].join("\n"),
    );
    expect(code.split("\n")[2]).toContain("AutocompleteArrayInput");
  });

  it("prints choices on a select input", () => {
    expect(printGuessedView("Edit", "posts", [status])).toContain(
      '<SelectInput source="status" choices={[{ id: "draft", name: "draft" }, { id: 2, name: "2" }]} />',
    );
  });

  it("wraps every Show field in RecordField", () => {
    expect(printGuessedView("Show", "posts", [id, title, published])).toBe(
      [
        'Guessed Show for "posts":',
        "",
        'import { BooleanField, RecordField, Show } from "@chelone/react";',
        "",
        "export const PostsShow = () => (",
        "  <Show>",
        '    <RecordField source="id" />',
        '    <RecordField source="title" />',
        '    <RecordField source="published">',
        '      <BooleanField source="published" />',
        "    </RecordField>",
        "  </Show>",
        ");",
      ].join("\n"),
    );
  });

  it("imports each component once from @chelone/react, sorted", () => {
    const code = printGuessedView("List", "posts", [
      published,
      authorId,
      { ...published, source: "featured" },
      title,
    ]);
    const imports = code
      .split("\n")
      .filter((line) => line.startsWith("import"));
    expect(imports).toEqual([
      'import { BooleanField, DataTable, List, ReferenceField } from "@chelone/react";',
    ]);
  });

  it("names the component after the PascalCase resource and the view", () => {
    expect(printGuessedView("List", "posts", [title])).toContain(
      "export const PostsList = () => (",
    );
    expect(printGuessedView("Show", "blog-posts", [title])).toContain(
      "export const BlogPostsShow = () => (",
    );
    expect(printGuessedView("Edit", "user_profiles", [title])).toContain(
      "export const UserProfilesEdit = () => (",
    );
  });

  it("lists unsupported fields as skipped after the code", () => {
    const code = printGuessedView("Show", "posts", [title, meta]);
    expect(code).not.toContain('source="meta"');
    expect(code.endsWith(");\n\nSkipped: meta (record schema)")).toBe(true);
  });

  it("escapes a source that holds a quote in every opening tag", () => {
    const quoted = { ...published, source: 'a"b' };
    expect(printGuessedView("List", "posts", [quoted])).toContain(
      '<DataTable.Col source={"a\\"b"}>',
    );
    expect(printGuessedView("Show", "posts", [quoted])).toContain(
      '<RecordField source={"a\\"b"}>',
    );
  });

  it("prints the described label on the column, row and input", () => {
    const headline = { ...title, label: "Headline" };
    expect(printGuessedView("List", "posts", [headline])).toContain(
      '<DataTable.Col source="title" label="Headline" />',
    );
    expect(printGuessedView("Show", "posts", [headline])).toContain(
      '<RecordField source="title" label="Headline" />',
    );
    expect(printGuessedView("Edit", "posts", [headline])).toContain(
      '<TextInput source="title" label="Headline" />',
    );
    expect(
      printGuessedView("List", "posts", [{ ...published, label: "Live" }]),
    ).toContain('<DataTable.Col source="published" label="Live">');
  });

  it("prints no Skipped line when every field is supported", () => {
    expect(printGuessedView("Show", "posts", [title])).not.toContain("Skipped");
  });
});
