import {
  BooleanField,
  DataTable,
  EditButton,
  List,
  ReferenceField,
  TextField,
} from "@chelone/react";

/** A `<List>` over the seeded `posts`: a `<DataTable>` with a text column, a
 *  reference column, a number column, a boolean, and a row action. */
export default function ListBasicDemo() {
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
