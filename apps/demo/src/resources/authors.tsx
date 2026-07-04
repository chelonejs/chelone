import {
  Create,
  DataTable,
  Edit,
  EmailField,
  List,
  RecordField,
  Show,
  TextField,
  TextInput,
} from "@chelone/react";

export function AuthorList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="email">
          <EmailField source="email" />
        </DataTable.Col>
      </DataTable>
    </List>
  );
}

export function AuthorEdit() {
  return (
    <Edit>
      <TextInput source="name" />
      <TextInput source="email" />
    </Edit>
  );
}

export function AuthorCreate() {
  return (
    <Create>
      <TextInput source="name" />
      <TextInput source="email" />
    </Create>
  );
}

export function AuthorShow() {
  return (
    <Show>
      <RecordField source="name" />
      <RecordField label="Email">
        <EmailField source="email" />
      </RecordField>
      <TextField source="email" />
    </Show>
  );
}
