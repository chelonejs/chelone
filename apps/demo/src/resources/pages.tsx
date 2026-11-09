/**
 * The pages resource: a page's body is HTML written in `<RichTextInput>` and
 * shown by `<RichTextField>`, and its release notes are markdown written in
 * `<MdxInput>` and shown by `<MdxField>`. Both are add-ons, so they come from
 * their subpaths, with the stylesheet the editor itself does not import.
 */

import {
  createResourceComponents,
  DataTable,
  EditButton,
  TextField,
  Toolbar,
} from "@chelone/react";
import { MdxField, MdxInput } from "@chelone/react/mdx-editor";
import { RichTextField, RichTextInput } from "@chelone/react/rich-text-input";
import "@mdxeditor/editor/style.css";

const pages = createResourceComponents("pages");

export function PageList() {
  return (
    <pages.List>
      <DataTable>
        <DataTable.Col source="title" />
        <DataTable.Col source="slug" />
        <DataTable.Col source="status">
          <pages.BadgeField source="status" />
        </DataTable.Col>
        <DataTable.Col label="Author">
          <pages.ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </pages.ReferenceField>
        </DataTable.Col>
        <DataTable.Col>
          <EditButton />
        </DataTable.Col>
      </DataTable>
    </pages.List>
  );
}

export function PageEdit() {
  return (
    <pages.Edit>
      <pages.TextInput source="title" />
      <pages.TextInput source="slug" />
      <RichTextInput source="body" label="Body" />
      <MdxInput source="release_notes" label="Release notes" />
      <Toolbar />
    </pages.Edit>
  );
}

export function PageShow() {
  return (
    <pages.Show>
      <pages.RecordField source="title" />
      <pages.RecordField label="Body">
        <RichTextField source="body" empty="No content" />
      </pages.RecordField>
      <pages.RecordField label="Release notes">
        <MdxField source="release_notes" empty="No release notes" />
      </pages.RecordField>
    </pages.Show>
  );
}
