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

  it("prints no Skipped line when every field is supported", () => {
    expect(printGuessedView("Show", "posts", [title])).not.toContain("Skipped");
  });
});
