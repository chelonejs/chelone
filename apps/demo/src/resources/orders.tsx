import { statusChoices } from "@chelone/demo-data";
import {
  AutocompleteArrayInput,
  AutocompleteInput,
  BadgeField,
  ChipField,
  Create,
  DataTable,
  DateField,
  DateTimeInput,
  DurationField,
  DurationInput,
  Edit,
  List,
  NumberField,
  NumberInput,
  RecordField,
  ReferenceArrayField,
  ReferenceArrayInput,
  ReferenceField,
  ReferenceInput,
  ReferenceOneField,
  SaveButton,
  SelectInput,
  Show,
  SingleFieldList,
  TextField,
  TextInput,
  TimeInput,
  Toolbar,
} from "@chelone/react";

/** The customer and the products an order is for. */
function OrderRelationInputs() {
  return (
    <>
      <ReferenceInput source="customer_id" reference="customers">
        <AutocompleteInput optionText="name" label="Customer" />
      </ReferenceInput>
      <ReferenceInput source="product_id" reference="products">
        <SelectInput optionText="name" label="Main product" />
      </ReferenceInput>
      <ReferenceArrayInput source="product_ids" reference="products">
        <AutocompleteArrayInput optionText="name" label="Products" />
      </ReferenceArrayInput>
    </>
  );
}

/** When the order is delivered and how long the warehouse needs to prepare it. */
function OrderDeliveryInputs() {
  return (
    <>
      <DateTimeInput source="delivery_at" label="Delivery" />
      <TimeInput
        source="slot"
        label="Slot opens"
        parse={(time) => time || null}
      />
      <DurationInput
        source="handling"
        label="Handling time"
        units={["h", "m"]}
      />
    </>
  );
}

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
        <DataTable.NumberCol
          source="total"
          options={{ style: "currency", currency: "USD" }}
        />
      </DataTable>
    </List>
  );
}

export function OrderEdit() {
  return (
    <Edit>
      <TextInput source="reference" />
      <OrderRelationInputs />
      <NumberInput source="quantity" min={1} />
      <OrderDeliveryInputs />
      <SelectInput source="status" choices={statusChoices} />
      <NumberInput source="total" step={0.01} min={0} />
      <Toolbar />
    </Edit>
  );
}

export function OrderCreate() {
  return (
    <Create>
      <TextInput source="reference" />
      <OrderRelationInputs />
      <NumberInput source="quantity" min={1} defaultValue={1} />
      <OrderDeliveryInputs />
      <SelectInput source="status" choices={statusChoices} />
      <NumberInput source="total" step={0.01} min={0} defaultValue={0} />
      <Toolbar>
        <SaveButton />
      </Toolbar>
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
      <RecordField label="Products">
        <ReferenceArrayField source="product_ids" reference="products">
          <SingleFieldList>
            <ChipField source="name" />
          </SingleFieldList>
        </ReferenceArrayField>
      </RecordField>
      <RecordField label="Quantity">
        <NumberField source="quantity" />
      </RecordField>
      <RecordField label="Delivery">
        <DateField source="delivery_at" showTime />
      </RecordField>
      <RecordField label="Handling time">
        <DurationField source="handling" displayFormat="relative" />
      </RecordField>
      <RecordField label="Customer's latest order">
        <ReferenceOneField
          reference="orders"
          target="customer_id"
          source="customer_id"
          sort={{ field: "delivery_at", order: "DESC" }}
        >
          <TextField source="reference" />
        </ReferenceOneField>
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
