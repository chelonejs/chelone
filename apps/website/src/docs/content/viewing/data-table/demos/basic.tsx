import {
  BooleanField,
  DataTable,
  List,
  ReferenceField,
  TextField,
} from "@chelone/react";

/** `<DataTable>` over the seeded posts: a text column, a reference column, a number column and a boolean column, sortable from the header. */
export default function DataTableDemo() {
  return (
    <List perPage={5} title={false}>
      <DataTable rowClick={false}>
        <DataTable.Col source="title" />
        <DataTable.Col label="Author">
          <ReferenceField source="author_id" reference="authors" link={false}>
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.NumberCol source="views" />
        <DataTable.Col source="published">
          <BooleanField source="published" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}
