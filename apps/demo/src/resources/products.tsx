import { categoryChoices } from "@chelone/demo-data";
import {
  Create,
  DataTable,
  Edit,
  List,
  NumberField,
  NumberInput,
  RecordField,
  SaveButton,
  SelectInput,
  Show,
  TextField,
  TextInput,
  Toolbar,
} from "@chelone/react";

export function ProductList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="name" />
        <DataTable.Col source="sku" />
        <DataTable.Col source="category" />
        <DataTable.NumberCol
          source="price"
          options={{ style: "currency", currency: "USD" }}
        />
        <DataTable.NumberCol source="stock" />
      </DataTable>
    </List>
  );
}

export function ProductEdit() {
  return (
    <Edit>
      <div className="flex max-w-xl flex-col gap-4">
        <TextInput source="name" />
        <TextInput source="sku" />
        <SelectInput source="category" choices={categoryChoices} />
        <NumberInput source="price" step={0.01} min={0} />
        <NumberInput source="stock" min={0} />
      </div>
      <Toolbar />
    </Edit>
  );
}

export function ProductCreate() {
  return (
    <Create>
      <div className="flex max-w-xl flex-col gap-4">
        <TextInput source="name" />
        <TextInput source="sku" />
        <SelectInput source="category" choices={categoryChoices} />
        <NumberInput source="price" step={0.01} min={0} defaultValue={0} />
        <NumberInput source="stock" min={0} defaultValue={0} />
      </div>
      <Toolbar>
        <SaveButton />
      </Toolbar>
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
