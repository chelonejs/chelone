import type { FileSelection } from "@chelone/core";
import {
  categoryChoices,
  channelChoices,
  shippingClassChoices,
  tagChoices,
} from "@chelone/demo-data";
import {
  CheckboxGroupInput,
  ColorInput,
  Create,
  CurrencyInput,
  DataTable,
  Edit,
  FileField,
  FileInput,
  ImageInput,
  List,
  NullableBooleanInput,
  NumberField,
  NumberInput,
  RadioButtonGroupInput,
  RatingInput,
  RecordField,
  ResettableTextInput,
  SaveButton,
  SelectArrayInput,
  SelectInput,
  Show,
  TextArrayInput,
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

/** The seed stores a spec sheet as its URL; the preview reads `{ src, title }`. */
function specSheetEntry(value: FileSelection): FileSelection {
  if (typeof value !== "string") return value;
  return { src: value, title: value.split("/").pop() };
}

/** The product form, shared by Edit and Create. */
function ProductInputs() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <TextInput source="name" />
      <ResettableTextInput source="sku" />
      <SelectInput source="category" choices={categoryChoices} />
      <CurrencyInput source="price" currency="USD" defaultValue={0} />
      <NumberInput source="stock" min={0} defaultValue={0} />
      <RatingInput source="rating" allowHalf />
      <ColorInput source="color" />
      <ImageInput source="image" />
      <FileInput
        source="spec_sheet"
        accept={{ "application/pdf": [] }}
        format={specSheetEntry}
      >
        <FileField source="src" title="title" />
      </FileInput>
      <CheckboxGroupInput source="channels" choices={channelChoices} />
      <RadioButtonGroupInput
        source="shipping_class"
        choices={shippingClassChoices}
        row
      />
      <SelectArrayInput source="tags" choices={tagChoices} />
      <TextArrayInput source="keywords" />
      <NullableBooleanInput source="featured" label="Featured" />
    </div>
  );
}

export function ProductEdit() {
  return (
    <Edit>
      <ProductInputs />
      <Toolbar />
    </Edit>
  );
}

export function ProductCreate() {
  return (
    <Create>
      <ProductInputs />
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
