import { categoryChoices } from "@chelone/demo-data";
import {
  Create,
  DataTable,
  Edit,
  List,
  NumberField,
  NumberInput,
  RecordField,
  SelectInput,
  Show,
  TextField,
  TextInput,
} from "@chelone/react";

export function ProductList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="sku" />
        <DataTable.Col source="category" />
        <DataTable.NumberCol source="price">
          <NumberField
            source="price"
            options={{ style: "currency", currency: "USD" }}
          />
        </DataTable.NumberCol>
        <DataTable.NumberCol source="stock" />
      </DataTable>
    </List>
  );
}

export function ProductEdit() {
  return (
    <Edit>
      <TextInput source="name" />
      <TextInput source="sku" />
      <SelectInput source="category" choices={categoryChoices} />
      <NumberInput source="price" step={0.01} min={0} />
      <NumberInput source="stock" min={0} />
    </Edit>
  );
}

export function ProductCreate() {
  return (
    <Create>
      <TextInput source="name" />
      <TextInput source="sku" />
      <SelectInput source="category" choices={categoryChoices} />
      <NumberInput source="price" step={0.01} min={0} defaultValue={0} />
      <NumberInput source="stock" min={0} defaultValue={0} />
    </Create>
  );
}

export function ProductShow() {
  return (
    <Show>
      <RecordField source="name" />
      <RecordField source="sku" />
      <RecordField source="category" />
      <RecordField label="Price">
        <NumberField
          source="price"
          options={{ style: "currency", currency: "USD" }}
        />
      </RecordField>
      <RecordField label="Stock">
        <NumberField source="stock" />
      </RecordField>
      <TextField source="name" />
    </Show>
  );
}
