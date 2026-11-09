/**
 * The customers demo, built from `createResourceComponents("customers")`: every
 * `source` here is checked against `customerSchema`, so a typo is a compile
 * error and not a blank column at runtime. `customerSchema` is registered in
 * `./index.ts`, which is also what gives the Edit/Create forms their validation
 * for free.
 *
 * `DataTable`, `Toolbar`, the bulk and selection buttons and `SimpleList` stay
 * plain imports: the factory returns views, fields and inputs, and a table
 * column takes any field name.
 */
import type { RegisteredRecord } from "@chelone/core";
import type { Customer } from "@chelone/demo-data";
import {
  BulkActionsToolbar,
  BulkDeleteButton,
  BulkEditDrawer,
  BulkExportButton,
  BulkUpdateButton,
  CancelButton,
  ColumnsButton,
  Count,
  createResourceComponents,
  DataTable,
  ExportButton,
  ListContextProvider,
  ListPagination,
  RefreshButton,
  RefreshIconButton,
  SaveButton,
  SelectAllButton,
  SimpleList,
  Toolbar,
  UpdateButton,
  useListController,
  useRecordContext,
  useRefresh,
} from "@chelone/react";
import { CsvImport } from "@chelone/react/csv-import";
import { z } from "zod";

/**
 * The record the views read and the forms validate against.
 *
 * Only what both forms carry an input for is required: `<CustomerCreate>` has
 * no phone, plan or joined-on input, and the create form validates against this
 * same schema, so the rest has to stay optional. Each message covers both ways
 * an input fails: cleared to null (the type error) and left empty (the check).
 */
export const customerSchema = z.object({
  id: z.number().optional(),
  name: z.string({ error: "Name is required" }).min(1, "Name is required"),
  email: z.email({ error: "Enter a valid email address" }),
  city: z.string({ error: "City is required" }).min(1, "City is required"),
  phone: z.string({ error: "Phone must be text" }).optional(),
  joined_on: z.string({ error: "Customer since must be a date" }).optional(),
  // The same ids `plans` and `segmentChoices` offer.
  plan: z
    .enum(["free", "pro", "team", "enterprise"], { error: "Pick a plan" })
    .optional(),
  segment: z
    .enum(["new", "active", "at-risk", "champion"], { error: "Pick a segment" })
    .optional(),
  usage: z.number().optional(),
  usage_limit: z.number().optional(),
});

const customers = createResourceComponents("customers");

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
        <customers.SelectInput source="segment" choices={segmentChoices} />
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
        {/* The rows are seed rows, which always carry an `id`; the schema's is
            optional because a create has none, and `<SimpleList>` asks for a
            record that has one. */}
        <SimpleList<Customer>
          primaryText={(customer) => customer.name}
          secondaryText={(customer) => customer.email}
          linkType="edit"
        />
      </ListContextProvider>
    </section>
  );
}

export function CustomerList() {
  return (
    <customers.List perPage={5} actions={<CustomerActions />}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <DataTable bulkActionsToolbar={<CustomerBulkActions />}>
            <DataTable.Col source="name" />
            <DataTable.Col source="email">
              <customers.EmailField source="email" />
            </DataTable.Col>
            <DataTable.Col source="city" />
            <DataTable.Col source="plan" />
            <DataTable.Col source="segment" />
          </DataTable>
          <ListPagination />
        </div>
        <AtRiskCustomers />
      </div>
    </customers.List>
  );
}

export function CustomerEdit() {
  return (
    <customers.Edit>
      <customers.TextInput source="name" />
      <customers.TextInput source="email" />
      <customers.TextInput source="city" />
      <customers.PhoneInput source="phone" />
      <customers.DateInput source="joined_on" label="Customer since" />
      <customers.SubscriptionPlanPicker source="plan" plans={plans} />
      <Toolbar>
        <div className="flex gap-2">
          <SaveButton />
          <CancelButton />
        </div>
      </Toolbar>
    </customers.Edit>
  );
}

export function CustomerCreate() {
  return (
    <customers.Create>
      <customers.TextInput source="name" />
      <customers.TextInput source="email" />
      <customers.TextInput source="city" />
      <Toolbar>
        <SaveButton />
      </Toolbar>
    </customers.Create>
  );
}

/** How many customers are on the plan of the one shown; the number links to that list. */
function CustomersOnPlan() {
  const customer = useRecordContext<RegisteredRecord<"customers">>();
  if (customer?.plan == null) return null;
  return <Count filter={{ plan: customer.plan }} link />;
}

export function CustomerShow() {
  return (
    <customers.Show
      actions={
        <UpdateButton data={{ segment: "champion" }} label="Mark champion" />
      }
    >
      <customers.RecordField source="name" />
      <customers.RecordField label="Email">
        <customers.EmailField source="email" />
      </customers.RecordField>
      <customers.RecordField label="Phone">
        <customers.PhoneField source="phone" />
      </customers.RecordField>
      <customers.RecordField source="city" />
      <customers.RecordField label="Customer since">
        <customers.DateField source="joined_on" />
      </customers.RecordField>
      <customers.RecordField label="Plan">
        <customers.SubscriptionPlanField source="plan" plans={plans} />
      </customers.RecordField>
      <customers.RecordField label="Customers on this plan">
        <CustomersOnPlan />
      </customers.RecordField>
      <customers.RecordField label="Usage">
        <customers.UsageMeterField
          source="usage"
          limitSource="usage_limit"
          unit="%"
          className="w-64"
        />
      </customers.RecordField>
      <customers.RecordField label="Order count">
        <customers.ReferenceManyCount reference="orders" target="customer_id" />
      </customers.RecordField>
      <customers.RecordField label="Orders">
        <customers.ReferenceManyField reference="orders" target="customer_id">
          <DataTable>
            <DataTable.Col source="reference" />
            <DataTable.Col source="status" />
            <DataTable.NumberCol source="total" />
          </DataTable>
          <ListPagination />
        </customers.ReferenceManyField>
      </customers.RecordField>
    </customers.Show>
  );
}
