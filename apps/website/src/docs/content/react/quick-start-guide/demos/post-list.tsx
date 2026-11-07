import {
  BooleanField,
  DataTable,
  EditButton,
  List,
  ReferenceField,
  TextField,
} from "@chelone/react";

/** The quickstart list — a DataTable over the seeded `posts`, with an
 *  author reference, a boolean, and a row edit button. */
export default function PostListDemo() {
  return (
    <List>
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
    </List>
  );
}
