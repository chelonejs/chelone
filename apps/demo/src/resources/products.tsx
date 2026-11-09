/**
 * The products demo, built from `createResourceComponents("products")`: every
 * `source` here is checked against `productSchema`, so a typo is a compile
 * error and not a blank column at runtime. `productSchema` is registered in
 * `./index.ts`, which is also what gives the Edit/Create forms their validation
 * for free.
 *
 * Plain imports stay for what the factory does not return (`DataTable`, the
 * filter, sort, toolbar, layout and button components), and for `FileField`
 * inside `FileInput` (it reads the picked file, not the product).
 *
 * The stock line is a small component and not a `FunctionField`: that field is
 * generic over its record, so the factory reads it at the loose record and its
 * `render` would get no `stock`.
 */
import type { FileSelection, RegisteredRecord } from "@chelone/core";
import {
  categoryChoices,
  channelChoices,
  shippingClassChoices,
  tagChoices,
} from "@chelone/demo-data";
import {
  CardContentInner,
  CloneButton,
  CreateButton,
  createResourceComponents,
  DataTable,
  DeleteButton,
  FileField,
  FilterList,
  FilterListItem,
  FilterListSection,
  FilterLiveSearch,
  Labeled,
  ListButton,
  ListPagination,
  ListToolbar,
  PrevNextButtons,
  SaveButton,
  SavedQueriesList,
  ShowButton,
  SortButton,
  TabbedShowLayout,
  ToggleFilterButton,
  Toolbar,
  TopToolbar,
  useRecordContext,
} from "@chelone/react";
import { z } from "zod";
import { Card } from "@/components/ui/card";

/** A file input's value: the stored URL or `{ src, title }`, or a picked file. */
const fileSchema = z
  .union([z.string(), z.looseObject({ src: z.string().optional() })])
  .nullish();

/** The record the views read and the forms validate against. */
export const productSchema = z.object({
  id: z.number().optional(),
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  sku: z.string({ error: "SKU is required" }).min(1, "SKU is required"),
  price: z.number({ error: "Price is required" }).min(0),
  stock: z.number({ error: "Stock is required" }).min(0),
  category: z.string().nullish(),
  category_id: z.number().optional(),
  rating: z.number().nullish(),
  color: z.string().nullish(),
  image: fileSchema,
  spec_sheet: fileSchema,
  channels: z.array(z.string()).nullish(),
  shipping_class: z.string().nullish(),
  tags: z.array(z.number()).nullish(),
  featured: z.boolean().nullish(),
  keywords: z.array(z.string()).nullish(),
  url: z.string().optional(),
  variants: z
    .array(z.object({ sku: z.string(), option: z.string(), stock: z.number() }))
    .optional(),
});

const products = createResourceComponents("products");

/**
 * The toolbar's filters: a SKU lookup that is always on, and a shipping class
 * the Add filter menu can bring in.
 */
const toolbarFilters = [
  <products.SearchInput
    key="sku"
    source="sku"
    placeholder="Find by SKU"
    alwaysOn
    className="w-56"
  />,
  <products.SelectInput
    key="shipping_class"
    source="shipping_class"
    label="Shipping class"
    choices={shippingClassChoices}
  />,
];

/** Sort and create sit in the page header, beside the title. */
function ProductListActions() {
  return (
    <TopToolbar className="mb-0">
      <SortButton
        fields={["name", "price", "stock", "rating"]}
        label="Sort by {field} ({order})"
      />
      <CreateButton />
    </TopToolbar>
  );
}

/** Live search, one-click filters and saved queries, in the column beside the table. */
function ProductSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6">
      <FilterLiveSearch placeholder="Search products" />
      <FilterList label="Category">
        {categoryChoices.map((choice) => (
          <FilterListItem
            key={choice.id}
            label={choice.name}
            value={{ category: choice.id }}
          />
        ))}
      </FilterList>
      <FilterList label="Shipping">
        {shippingClassChoices.map((choice) => (
          <FilterListItem
            key={choice.id}
            label={choice.name}
            value={{ shipping_class: choice.id }}
          />
        ))}
      </FilterList>
      <FilterListSection label="Availability">
        <div className="flex flex-wrap gap-2 px-2">
          <ToggleFilterButton label="Out of stock" value={{ stock: 0 }} />
          <ToggleFilterButton label="Featured" value={{ featured: true }} />
        </div>
      </FilterListSection>
      <FilterListSection label="Saved queries">
        <div className="px-2">
          <SavedQueriesList />
        </div>
      </FilterListSection>
    </aside>
  );
}

export function ProductList() {
  return (
    <products.List actions={<ProductListActions />} perPage={10}>
      <div className="flex items-start gap-6">
        <ProductSidebar />
        <div className="min-w-0 flex-1">
          <ListToolbar
            filters={toolbarFilters}
            hasCreate={false}
            exporter={false}
            className="mb-4"
          />
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
          <ListPagination />
        </div>
      </div>
    </products.List>
  );
}

/** The seed stores a spec sheet as its URL; the preview reads `{ src, title }`. */
function specSheetEntry(value: FileSelection | undefined): FileSelection {
  if (value === undefined) return null;
  if (typeof value !== "string") return value;
  return { src: value, title: value.split("/").pop() };
}

/** The product form, shared by Edit and Create. */
function ProductInputs() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <products.TextInput source="name" />
      <products.ResettableTextInput source="sku" />
      <products.SelectInput source="category" choices={categoryChoices} />
      <products.CurrencyInput source="price" currency="USD" defaultValue={0} />
      <products.NumberInput source="stock" min={0} defaultValue={0} />
      <products.RatingInput source="rating" allowHalf />
      <products.ColorInput source="color" />
      <products.ImageInput source="image" />
      <products.FileInput
        source="spec_sheet"
        accept={{ "application/pdf": [] }}
        format={specSheetEntry}
      >
        <FileField source="src" title="title" />
      </products.FileInput>
      <products.CheckboxGroupInput source="channels" choices={channelChoices} />
      <products.RadioButtonGroupInput
        source="shipping_class"
        choices={shippingClassChoices}
        row
      />
      <products.SelectArrayInput source="tags" choices={tagChoices} />
      <products.TextArrayInput source="keywords" />
      <products.NullableBooleanInput source="featured" label="Featured" />
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

/** What a shopper is told about the record's `stock`, read as the registered product. */
function StockLine() {
  const record = useRecordContext<RegisteredRecord<"products">>();
  if (!record) return null;
  return (
    <span className="text-sm text-muted-foreground">
      {availability(record.stock)}
    </span>
  );
}

export function ProductEdit() {
  return (
    <products.Edit actions={<ShowButton />}>
      <ProductInputs />
      <Toolbar />
    </products.Edit>
  );
}

export function ProductCreate() {
  return (
    <products.Create>
      <ProductInputs />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </products.Create>
  );
}

export function ProductShow() {
  return (
    <products.Show actions={<ProductShowActions />}>
      <Card className="max-w-3xl">
        <CardContentInner className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <Labeled>
            <products.CurrencyField
              source="price"
              currency="USD"
              className="text-2xl font-semibold"
            />
          </Labeled>
          <Labeled>
            <products.RatingField source="rating" allowHalf />
          </Labeled>
          <products.ChipField source="sku" />
          <StockLine />
        </CardContentInner>
        <CardContentInner>
          <TabbedShowLayout>
            <TabbedShowLayout.Tab label="Overview">
              <products.SelectField
                source="category"
                choices={categoryChoices}
              />
              <products.NumberField source="stock" />
              <products.WrapperField label="Fulfilment">
                <div className="flex flex-wrap items-center gap-2">
                  <products.SelectField
                    source="shipping_class"
                    choices={shippingClassChoices}
                  />
                  <products.TextArrayField source="channels" />
                </div>
              </products.WrapperField>
              <products.TextArrayField source="keywords" />
            </TabbedShowLayout.Tab>
            <TabbedShowLayout.Tab label="Media">
              <products.ImageField
                title="Product photo"
                source="image"
                className="[&_img]:max-w-xs [&_img]:rounded-md"
              />
              <products.ColorField source="color" />
              <products.FileField source="spec_sheet" title="Download PDF" />
              <Labeled label="URL">
                <products.UrlField source="url" />
              </Labeled>
            </TabbedShowLayout.Tab>
            <TabbedShowLayout.Tab label="Raw data">
              <products.JsonField source="variants" />
            </TabbedShowLayout.Tab>
          </TabbedShowLayout>
        </CardContentInner>
      </Card>
    </products.Show>
  );
}
