/**
 * The authors demo, built from `createResourceComponents("authors")`: every
 * `source` here is checked against `authorSchema`, so a typo is a compile error
 * and not a blank column at runtime. `authorSchema` is registered in
 * `./index.ts`, which is also what gives the Edit/Create forms their validation
 * for free.
 *
 * `DataTable`, `Toolbar` and `SaveButton` stay plain imports: the factory
 * returns views, fields and inputs, and a table column takes any field name.
 */
import {
  createResourceComponents,
  DataTable,
  SaveButton,
  Toolbar,
} from "@chelone/react";
import { z } from "zod";

/** The record the views read and the forms validate against. */
export const authorSchema = z.object({
  id: z.number().optional(),
  // Each message covers both ways an input fails: cleared to null (the type
  // error) and left empty (the check).
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  email: z.email({ error: "Enter a valid email address" }),
});

const authors = createResourceComponents("authors");

export function AuthorList() {
  return (
    <authors.List>
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="email">
          <authors.EmailField source="email" />
        </DataTable.Col>
      </DataTable>
    </authors.List>
  );
}

export function AuthorEdit() {
  return (
    <authors.Edit>
      <authors.TextInput source="name" />
      <authors.TextInput source="email" />
      <Toolbar />
    </authors.Edit>
  );
}

export function AuthorCreate() {
  return (
    <authors.Create>
      <authors.TextInput source="name" />
      <authors.TextInput source="email" />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </authors.Create>
  );
}

export function AuthorShow() {
  return (
    <authors.Show>
      <authors.RecordField source="name" />
      <authors.RecordField label="Email">
        <authors.EmailField source="email" />
      </authors.RecordField>
      <authors.TextField source="email" />
      <authors.RecordField label="Posts">
        <authors.ReferenceManyField
          reference="posts"
          target="author_id"
          perPage={5}
        >
          <DataTable rowClick={false}>
            <DataTable.Col source="title" />
            <DataTable.NumberCol source="views" />
          </DataTable>
        </authors.ReferenceManyField>
      </authors.RecordField>
    </authors.Show>
  );
}
