import type { LooseRecord } from "@chelone/core";
import {
  BulkActionsToolbar,
  BulkDeleteButton,
  BulkEditDrawer,
  BulkExportButton,
  BulkUpdateButton,
  ColumnsButton,
  Create,
  DataTable,
  Edit,
  EmailField,
  ExportButton,
  List,
  ListContextProvider,
  ListPagination,
  RecordField,
  ReferenceManyField,
  RefreshButton,
  RefreshIconButton,
  SelectAllButton,
  SelectInput,
  Show,
  SimpleList,
  TextInput,
  useListController,
} from "@chelone/react";
import { CsvImport } from "@chelone/react/csv-import";
import { z } from "zod";

const segmentChoices = ["new", "active", "at-risk", "champion"].map((id) => ({
  id,
  name: id,
}));

/** The columns an imported CSV must carry; the rest of a customer is optional. */
const customerImportSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  plan: z.string().optional(),
  segment: z.string().optional(),
});

/** Selected rows change segment, leave as a file or go. */
function CustomerBulkActions() {
  return (
    <BulkActionsToolbar>
      <SelectAllButton />
      <BulkEditDrawer label="Edit customers" title="Edit selected customers">
        <SelectInput source="segment" choices={segmentChoices} />
      </BulkEditDrawer>
      <BulkUpdateButton label="Mark champion" data={{ segment: "champion" }} />
      <BulkExportButton />
      <BulkDeleteButton />
    </BulkActionsToolbar>
  );
}

function CustomerActions() {
  return (
    <>
      <ColumnsButton />
      <CsvImport schema={customerImportSchema} />
      <ExportButton />
      <RefreshIconButton label="Refresh customers" />
    </>
  );
}

/** The at-risk customers, as a short list beside the table. */
function AtRiskCustomers() {
  const controller = useListController("customers", {
    filter: { segment: "at-risk" },
    perPage: 5,
    storeKey: false,
    syncWithLocation: false,
  });
  return (
    <section
      aria-label="At-risk customers"
      className="rounded-md border lg:w-72 lg:shrink-0"
    >
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-medium">At risk</h3>
        <RefreshButton label="Refresh at-risk list" />
      </header>
      <ListContextProvider value={controller}>
        <SimpleList<LooseRecord>
          primaryText={(customer) => String(customer.name)}
          secondaryText={(customer) => String(customer.email)}
          linkType="edit"
        />
      </ListContextProvider>
    </section>
  );
}

export function CustomerList() {
  return (
    <List perPage={5} actions={<CustomerActions />}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <DataTable bulkActionsToolbar={<CustomerBulkActions />}>
            <DataTable.Col source="name" />
            <DataTable.Col source="email">
              <EmailField source="email" />
            </DataTable.Col>
            <DataTable.Col source="city" />
            <DataTable.Col source="plan" />
            <DataTable.Col source="segment" />
          </DataTable>
          <ListPagination />
        </div>
        <AtRiskCustomers />
      </div>
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
