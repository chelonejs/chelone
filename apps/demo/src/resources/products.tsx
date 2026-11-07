import type { FileSelection } from "@chelone/core";
import {
  categoryChoices,
  channelChoices,
  type Product,
  shippingClassChoices,
  tagChoices,
} from "@chelone/demo-data";
import {
  CardContentInner,
  CheckboxGroupInput,
  ChipField,
  CloneButton,
  ColorField,
  ColorInput,
  Create,
  CurrencyField,
  CurrencyInput,
  DataTable,
  DeleteButton,
  Edit,
  FileField,
  FileInput,
  FunctionField,
  ImageField,
  ImageInput,
  JsonField,
  Labeled,
  List,
  ListButton,
  NullableBooleanInput,
  NumberField,
  NumberInput,
  PrevNextButtons,
  RadioButtonGroupInput,
  RatingField,
  RatingInput,
  ResettableTextInput,
  SaveButton,
  SelectArrayInput,
  SelectField,
  SelectInput,
  Show,
  ShowButton,
  TabbedShowLayout,
  TextArrayField,
  TextArrayInput,
  TextInput,
  Toolbar,
  UrlField,
  WrapperField,
} from "@chelone/react";
import { Card } from "@/components/ui/card";

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

/** Previous and next sit first so they stay put while the other actions come and go. */
function ProductShowActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PrevNextButtons linkType="show" />
      <ListButton />
      <CloneButton />
      <DeleteButton />
    </div>
  );
}

/** What a shopper is told about `stock`. */
function availability(stock: number): string {
  if (stock === 0) return "Out of stock";
  return stock < 10 ? `Low stock: ${stock} left` : "In stock";
}

export function ProductEdit() {
  return (
    <Edit actions={<ShowButton />}>
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
    <Show actions={<ProductShowActions />}>
      <Card className="max-w-3xl">
        <CardContentInner className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <Labeled>
            <CurrencyField
              source="price"
              currency="USD"
              className="text-2xl font-semibold"
            />
          </Labeled>
          <Labeled>
            <RatingField source="rating" allowHalf />
          </Labeled>
          <ChipField source="sku" />
          <FunctionField<Product>
            source="stock"
            render={(record) => availability(record.stock)}
            className="text-sm text-muted-foreground"
          />
        </CardContentInner>
        <CardContentInner>
          <TabbedShowLayout>
            <TabbedShowLayout.Tab label="Overview">
              <SelectField source="category" choices={categoryChoices} />
              <NumberField source="stock" />
              <WrapperField label="Fulfilment">
                <div className="flex flex-wrap items-center gap-2">
                  <SelectField
                    source="shipping_class"
                    choices={shippingClassChoices}
                  />
                  <TextArrayField source="channels" />
                </div>
              </WrapperField>
              <TextArrayField source="keywords" />
            </TabbedShowLayout.Tab>
            <TabbedShowLayout.Tab label="Media">
              <ImageField
                title="Product photo"
                source="image"
                className="[&_img]:max-w-xs [&_img]:rounded-md"
              />
              <ColorField source="color" />
              <FileField source="spec_sheet" title="Download PDF" />
              <Labeled label="URL">
                <UrlField source="url" />
              </Labeled>
            </TabbedShowLayout.Tab>
            <TabbedShowLayout.Tab label="Raw data">
              <JsonField source="variants" />
            </TabbedShowLayout.Tab>
          </TabbedShowLayout>
        </CardContentInner>
      </Card>
    </Show>
  );
}
