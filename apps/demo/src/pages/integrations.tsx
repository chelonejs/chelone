/**
 * The Integrations page: the shop's API keys, and the settings behind its sync
 * and webhook. The keys are a table whose rows show the masked key and rotate
 * it; the settings are one form (webhook endpoint, sync schedule, JSON config
 * and mail password) beside a read-only summary of what is saved.
 */

import type { ApiKey } from "@chelone/demo-data";
import {
  ApiKeyField,
  ApiKeyInput,
  CronField,
  CronInput,
  DataTable,
  DateField,
  Edit,
  List,
  ListPagination,
  PasswordInput,
  RecordField,
  ResourceContextProvider,
  SaveButton,
  Show,
  Toolbar,
  useUpdate,
  WebhookEndpointField,
  WebhookEndpointInput,
} from "@chelone/react";
import { MonacoJsonField, MonacoJsonInput } from "@chelone/react/monaco";

export const title = "Integrations";
export const group = "Settings";

const EVENT_TYPES = [
  "order.created",
  "order.shipped",
  "post.published",
  "customer.created",
];

/**
 * A real server mints the new key and answers the update; the in-memory
 * provider cannot, so this stands in for it. Without `onRotate`, `<ApiKeyInput>`
 * writes `null` to the source and leaves the minting to the server.
 */
function newKey(): string {
  return `ck_live_${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function IntegrationsPage() {
  const update = useUpdate("api_keys");
  const rotate = async (key: ApiKey) => {
    await update.mutateAsync({
      id: key.id,
      data: { prefix: newKey() },
      previousData: key,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="API keys">
        <ResourceContextProvider value="api_keys">
          <List perPage={5} title="API keys">
            <DataTable rowClick={false}>
              <DataTable.Col source="name" />
              <DataTable.Col label="Key">
                <ApiKeyField
                  source="prefix"
                  scopesSource="scopes"
                  lastUsedSource="last_used_at"
                />
              </DataTable.Col>
              <DataTable.Col label="Expires">
                <DateField source="expires_at" empty="Never" />
              </DataTable.Col>
              <DataTable.Col label="Rotate">
                <ApiKeyInput<ApiKey>
                  source="prefix"
                  resource="api_keys"
                  onRotate={rotate}
                />
              </DataTable.Col>
            </DataTable>
            <ListPagination />
          </List>
        </ResourceContextProvider>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-label="Settings">
          <Edit
            resource="integration_settings"
            id={1}
            title="Sync and webhook settings"
          >
            <div className="flex max-w-xl flex-col gap-6">
              <WebhookEndpointInput
                source="webhook"
                label="Webhook endpoint"
                eventTypes={EVENT_TYPES}
              />
              <CronInput source="sync_schedule" label="Sync schedule" />
              <MonacoJsonInput
                source="sync_config"
                label="Sync config"
                height={200}
              />
              <PasswordInput source="smtp_password" label="Mail password" />
            </div>
            {/* The default toolbar also offers Delete, which this one record must not. */}
            <Toolbar>
              <SaveButton />
            </Toolbar>
          </Edit>
        </section>
        <section aria-label="Saved settings">
          <Show resource="integration_settings" id={1} title="Saved settings">
            <div className="flex flex-col gap-4">
              <RecordField label="Webhook endpoint">
                <WebhookEndpointField source="webhook" />
              </RecordField>
              <RecordField label="Sync schedule">
                <CronField source="sync_schedule" showExpression />
              </RecordField>
              <RecordField label="Sync config">
                <MonacoJsonField source="sync_config" />
              </RecordField>
            </div>
          </Show>
        </section>
      </div>
    </div>
  );
}
