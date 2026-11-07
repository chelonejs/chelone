/**
 * QUICKSTART — "point at a Zod schema" resource.
 *
 * `postSchema` (below) is registered via `defineResources({ posts: { schema:
 * postSchema } })` in `App.tsx` and passed to `<Admin resources={...}>`. Because
 * the resource carries a Zod schema, the Edit/Create forms get AUTOMATIC
 * validation from it (the D6 default validator): the controller reads the
 * registry schema and validates the form against it on submit — no per-field
 * `validate={...}` props needed. Zod ≥ 3.24 implements Standard Schema, so the
 * schema plugs straight into the form-core validation seam.
 *
 * Try it: open a post's Edit page, clear the Title, and submit — the schema's
 * `.min(1)` rule blocks the save and surfaces the message.
 */

import {
  BooleanField,
  BooleanInput,
  Create,
  DataTable,
  EditButton,
  EditLive,
  ListLive,
  LockOnMount,
  LockStatus,
  NumberField,
  NumberInput,
  RecordField,
  ReferenceField,
  ReferenceInput,
  SaveButton,
  SelectInput,
  Show,
  TextField,
  TextInput,
  Toolbar,
} from "@chelone/react";
import { ConfigurableInputs } from "@chelone/react/inspector";
import { z } from "zod";
import { SimulateOtherUser } from "../realtime-sim";

/** The record shape + the form validator, in one place. */
export const postSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().min(1, "Body is required"),
  author_id: z.number({ message: "Pick an author" }),
  views: z.number().min(0).optional(),
  published: z.boolean().optional(),
  /** Unused by the forms; gives `register-proof` an array for a bracket path. */
  tags: z.array(z.object({ label: z.string() })).optional(),
});

export function PostList() {
  return (
    <ListLive actions={<SimulateOtherUser />}>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col label="Author">
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.NumberCol source="views" />
        <DataTable.Col source="published">
          <BooleanField source="published" />
        </DataTable.Col>
        <DataTable.Col>
          <EditButton />
        </DataTable.Col>
      </DataTable>
    </ListLive>
  );
}

export function PostEdit() {
  return (
    <EditLive>
      <div className="mb-4 empty:hidden">
        <LockStatus />
      </div>
      <LockOnMount identity="you">
        {/* The user hides the inputs they never fill from the inspector. A
            hidden input keeps its loaded value, so the schema still passes. */}
        <ConfigurableInputs className="flex flex-col gap-4">
          <TextInput source="title" />
          <TextInput source="body" multiline />
          <ReferenceInput source="author_id" reference="authors">
            <SelectInput optionText="name" />
          </ReferenceInput>
          <NumberInput source="views" min={0} />
          <BooleanInput source="published" />
        </ConfigurableInputs>
        <Toolbar />
      </LockOnMount>
    </EditLive>
  );
}

export function PostCreate() {
  return (
    <Create>
      <TextInput source="title" />
      <TextInput source="body" multiline />
      <ReferenceInput source="author_id" reference="authors">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <NumberInput source="views" min={0} defaultValue={0} />
      <BooleanInput source="published" defaultValue={false} />
      <SaveButton />
    </Create>
  );
}

export function PostShow() {
  return (
    <Show>
      <RecordField source="title" />
      <RecordField source="body" />
      <RecordField label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </RecordField>
      <RecordField label="Views">
        <NumberField source="views" />
      </RecordField>
      <RecordField label="Published">
        <BooleanField source="published" />
      </RecordField>
    </Show>
  );
}
