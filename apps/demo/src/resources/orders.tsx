import {
  BadgeField,
  Create,
  DataTable,
  Edit,
  List,
  NumberField,
  NumberInput,
  RecordField,
  ReferenceField,
  ReferenceInput,
  SelectInput,
  Show,
  TextField,
  TextInput,
} from "@chelone/react";
import { statusChoices } from "../seed";

export function OrderList() {
  return (
    <List>
      <DataTable>
        <DataTable.Col source="reference" />
        <DataTable.Col label="Customer">
          <ReferenceField source="customer_id" reference="customers">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.Col label="Product">
          <ReferenceField source="product_id" reference="products">
            <TextField source="name" />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.NumberCol source="quantity" />
        <DataTable.Col source="status">
          <BadgeField source="status" />
        </DataTable.Col>
        <DataTable.NumberCol source="total">
          <NumberField
            source="total"
            options={{ style: "currency", currency: "USD" }}
          />
        </DataTable.NumberCol>
      </DataTable>
    </List>
  );
}

export function OrderEdit() {
  return (
    <Edit>
      <TextInput source="reference" />
      <ReferenceInput source="customer_id" reference="customers">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <ReferenceInput source="product_id" reference="products">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <NumberInput source="quantity" min={1} />
      <SelectInput source="status" choices={statusChoices} />
      <NumberInput source="total" step={0.01} min={0} />
    </Edit>
  );
}

export function OrderCreate() {
  return (
    <Create>
      <TextInput source="reference" />
      <ReferenceInput source="customer_id" reference="customers">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <ReferenceInput source="product_id" reference="products">
        <SelectInput optionText="name" />
      </ReferenceInput>
      <NumberInput source="quantity" min={1} defaultValue={1} />
      <SelectInput source="status" choices={statusChoices} />
      <NumberInput source="total" step={0.01} min={0} defaultValue={0} />
    </Create>
  );
}

export function OrderShow() {
  return (
    <Show>
      <RecordField source="reference" />
      <RecordField label="Customer">
        <ReferenceField source="customer_id" reference="customers">
          <TextField source="name" />
        </ReferenceField>
      </RecordField>
      <RecordField label="Product">
        <ReferenceField source="product_id" reference="products">
          <TextField source="name" />
        </ReferenceField>
      </RecordField>
      <RecordField label="Quantity">
        <NumberField source="quantity" />
      </RecordField>
      <RecordField label="Status">
        <BadgeField source="status" />
      </RecordField>
      <RecordField label="Total">
        <NumberField
          source="total"
          options={{ style: "currency", currency: "USD" }}
        />
      </RecordField>
    </Show>
  );
}
