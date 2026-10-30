import {
  Create,
  DataTable,
  Edit,
  EmailField,
  List,
  ListPagination,
  RecordField,
  ReferenceManyField,
  Show,
  TextInput,
} from "@chelone/react";

export function CustomerList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="email">
          <EmailField source="email" />
        </DataTable.Col>
        <DataTable.Col source="city" />
      </DataTable>
    </List>
  );
}

export function CustomerEdit() {
  return (
    <Edit>
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
    </Edit>
  );
}

export function CustomerCreate() {
  return (
    <Create>
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
    </Create>
  );
}

export function CustomerShow() {
  return (
    <Show>
      <RecordField source="name" />
      <RecordField label="Email">
        <EmailField source="email" />
      </RecordField>
      <RecordField source="city" />
      <RecordField label="Orders">
        <ReferenceManyField reference="orders" target="customer_id">
          <DataTable>
            <DataTable.Col source="reference" />
            <DataTable.Col source="status" />
            <DataTable.NumberCol source="total" />
          </DataTable>
          <ListPagination />
        </ReferenceManyField>
      </RecordField>
    </Show>
  );
}
