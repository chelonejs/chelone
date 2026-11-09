import {
  createResourceComponents,
  DataTable,
  ResourceContextProvider,
  SimpleFormIterator,
  TabbedForm,
  Toolbar,
} from "@chelone/react";

const products = createResourceComponents("products");

export const title = "Product variants";
export const group = "Catalog";

/**
 * One product, edited in three tabs: its variants as rows of size, SKU and
 * stock, the tags it carries, and a read-only stock table of what is saved.
 */
/** `<TabbedForm>` is headless, so the page styles its tab headers. */
const tabStyles =
  "[&_[role=tablist]]:mb-4 [&_[role=tablist]]:flex [&_[role=tablist]]:gap-1 [&_[role=tablist]]:border-b [&_[role=tab]]:-mb-px [&_[role=tab]]:border-b-2 [&_[role=tab]]:border-transparent [&_[role=tab]]:px-3 [&_[role=tab]]:py-2 [&_[role=tab]]:text-sm [&_[role=tab]]:font-medium [&_[role=tab]]:text-muted-foreground [&_[role=tab][aria-selected=true]]:border-foreground [&_[role=tab][aria-selected=true]]:text-foreground";

export default function ProductVariants() {
  return (
    <ResourceContextProvider value="products">
      <products.Edit id={1} title="Product variants">
        <div className={tabStyles}>
          <TabbedForm syncWithLocation={false}>
            <TabbedForm.Tab name="variants" label="Variants">
              <products.ArrayInput source="variants" label={false}>
                <SimpleFormIterator inline getItemLabel>
                  <products.TextInput source="option" label="Size" />
                  <products.TextInput source="sku" label="SKU" />
                  <products.NumberInput source="stock" label="Stock" min={0} />
                </SimpleFormIterator>
              </products.ArrayInput>
            </TabbedForm.Tab>
            <TabbedForm.Tab name="tags" label="Tags">
              <products.ReferenceArrayInput source="tags" reference="tags">
                <products.DatagridInput optionLabel="Tag" />
              </products.ReferenceArrayInput>
            </TabbedForm.Tab>
            <TabbedForm.Tab name="stock" label="Stock">
              <products.ArrayField source="variants">
                <DataTable>
                  <DataTable.Col source="option" label="Size" />
                  <DataTable.Col source="sku" label="SKU" />
                  <DataTable.NumberCol source="stock" label="Stock" />
                </DataTable>
              </products.ArrayField>
            </TabbedForm.Tab>
            <Toolbar />
          </TabbedForm>
        </div>
      </products.Edit>
    </ResourceContextProvider>
  );
}
