import type { LooseRecord } from "@chelone/core";
import {
  BulkActionsToolbar,
  BulkDeleteButton,
  BulkEditDrawer,
  BulkExportButton,
  BulkUpdateButton,
  CancelButton,
  ColumnsButton,
  Count,
  Create,
  DataTable,
  DateField,
  DateInput,
  Edit,
  EmailField,
  ExportButton,
  List,
  ListContextProvider,
  ListPagination,
  PhoneField,
  PhoneInput,
  RecordField,
  ReferenceManyCount,
  ReferenceManyField,
  RefreshButton,
  RefreshIconButton,
  SaveButton,
  SelectAllButton,
  SelectInput,
  Show,
  SimpleList,
  SubscriptionPlanField,
  SubscriptionPlanPicker,
  TextInput,
  Toolbar,
  UpdateButton,
  UsageMeterField,
  useListController,
  useRecordContext,
  useRefresh,
} from "@chelone/react";
import { CsvImport } from "@chelone/react/csv-import";
import { z } from "zod";

/** The plans a customer can be on, in the order the picker lays them out. */
const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    interval: "month",
    features: ["1 project", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    currency: "USD",
    interval: "month",
    features: ["Unlimited projects", "Email support"],
  },
  {
    id: "team",
    name: "Team",
    price: 99,
    currency: "USD",
    interval: "month",
    features: ["Everything in Pro", "Shared workspaces"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 2400,
    currency: "USD",
    interval: "year",
    features: ["Everything in Team", "Dedicated support"],
  },
] as const;

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

/** The import creates customers behind the list's back, so it refreshes the list when done. */
function ImportCustomers() {
  const refresh = useRefresh();
  return (
    <CsvImport schema={customerImportSchema} onComplete={() => refresh()} />
  );
}

function CustomerActions() {
  return (
    <>
      <ColumnsButton />
      <ImportCustomers />
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
      <PhoneInput source="phone" />
      <DateInput source="joined_on" label="Customer since" />
      <SubscriptionPlanPicker source="plan" plans={plans} />
      <Toolbar>
        <div className="flex gap-2">
          <SaveButton />
          <CancelButton />
        </div>
      </Toolbar>
    </Edit>
  );
}

export function CustomerCreate() {
  return (
    <Create>
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </Create>
  );
}

/** How many customers are on the plan of the one shown; the number links to that list. */
function CustomersOnPlan() {
  const customer = useRecordContext<LooseRecord>();
  if (customer?.plan == null) return null;
  return <Count filter={{ plan: customer.plan }} link />;
}

export function CustomerShow() {
  return (
    <Show
      actions={
        <UpdateButton data={{ segment: "champion" }} label="Mark champion" />
      }
    >
      <RecordField source="name" />
      <RecordField label="Email">
        <EmailField source="email" />
      </RecordField>
      <RecordField label="Phone">
        <PhoneField source="phone" />
      </RecordField>
      <RecordField source="city" />
      <RecordField label="Customer since">
        <DateField source="joined_on" />
      </RecordField>
      <RecordField label="Plan">
        <SubscriptionPlanField source="plan" plans={plans} />
      </RecordField>
      <RecordField label="Customers on this plan">
        <CustomersOnPlan />
      </RecordField>
      <RecordField label="Usage">
        <UsageMeterField
          source="usage"
          limitSource="usage_limit"
          unit="%"
          className="w-64"
        />
      </RecordField>
      <RecordField label="Order count">
        <ReferenceManyCount reference="orders" target="customer_id" />
      </RecordField>
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
