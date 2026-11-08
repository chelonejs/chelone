/**
 * The pages resource: a page's body is HTML written in `<RichTextInput>` and
 * shown by `<RichTextField>`, and its release notes are markdown written in
 * `<MdxInput>` and shown by `<MdxField>`. Both are add-ons, so they come from
 * their subpaths, with the stylesheet the editor itself does not import.
 */

import {
  BadgeField,
  DataTable,
  Edit,
  EditButton,
  List,
  RecordField,
  ReferenceField,
  Show,
  TextField,
  TextInput,
  Toolbar,
} from "@chelone/react";
import { MdxField, MdxInput } from "@chelone/react/mdx-editor";
import { RichTextField, RichTextInput } from "@chelone/react/rich-text-input";
import "@mdxeditor/editor/style.css";

export function PageList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col source="slug" />
        <DataTable.Col source="status">
          <BadgeField source="status" />
        </DataTable.Col>
        <DataTable.Col label="Author">
          <ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.Col>
          <EditButton />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}

export function PageEdit() {
  return (
    <Edit>
      <TextInput source="title" />
      <TextInput source="slug" />
      <RichTextInput source="body" label="Body" />
      <MdxInput source="release_notes" label="Release notes" />
      <Toolbar />
    </Edit>
  );
}

export function PageShow() {
  return (
    <Show>
      <RecordField source="title" />
      <RecordField label="Body">
        <RichTextField source="body" empty="No content" />
      </RecordField>
      <RecordField label="Release notes">
        <MdxField source="release_notes" empty="No release notes" />
      </RecordField>
    </Show>
  );
}
