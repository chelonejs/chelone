import {
  Create,
  DataTable,
  Edit,
  EmailField,
  List,
  RecordField,
  ReferenceManyField,
  SaveButton,
  Show,
  TextField,
  TextInput,
  Toolbar,
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
      <Toolbar />
    </Edit>
  );
}

export function AuthorCreate() {
  return (
    <Create>
      <TextInput source="name" />
      <TextInput source="email" />
      <Toolbar>
        <SaveButton />
      </Toolbar>
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
      <RecordField label="Posts">
        <ReferenceManyField reference="posts" target="author_id" perPage={5}>
          <DataTable rowClick={false}>
            <DataTable.Col source="title" />
            <DataTable.NumberCol source="views" />
          </DataTable>
        </ReferenceManyField>
      </RecordField>
    </Show>
  );
}
