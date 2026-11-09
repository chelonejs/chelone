/**
 * The Activity page: what happened in the shop, newest first, as an infinite
 * feed, with the most recent customers beside it. The feed and the customers
 * are both `<SimpleList>`s; each customer row lists their orders as badges in a
 * `<SingleFieldList>`.
 */

import type { Activity, Customer } from "@chelone/demo-data";
import {
  createResourceComponents,
  DateField,
  InfiniteList,
  InfinitePagination,
  List,
  ReferenceField,
  ReferenceManyField,
  ResourceContextProvider,
  SimpleList,
  SingleFieldList,
} from "@chelone/react";

const authors = createResourceComponents("authors");
const orders = createResourceComponents("orders");

export const title = "Activity";
export const group = "Shop";

export default function ActivityPage() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-label="Activity feed">
        <ResourceContextProvider value="activity">
          <InfiniteList perPage={8} title="Activity">
            <SimpleList<Activity>
              linkType={false}
              primaryText={(entry) =>
                `${entry.action} ${entry.resource} #${entry.record_id}`
              }
              secondaryText={() => (
                <ReferenceField
                  source="actor_id"
                  reference="authors"
                  link={false}
                >
                  <authors.TextField source="name" />
                </ReferenceField>
              )}
              rightIcon={() => (
                <span className="text-sm text-muted-foreground">
                  <DateField source="at" showTime />
                </span>
              )}
              className="divide-y rounded-md border"
            />
            <InfinitePagination />
          </InfiniteList>
        </ResourceContextProvider>
      </section>
      <section aria-label="Recent customers">
        <ResourceContextProvider value="customers">
          <List perPage={5} title="Recent customers">
            <SimpleList<Customer>
              primaryText={(customer) => customer.name}
              secondaryText={(customer) => customer.city}
              tertiaryText={() => (
                <ReferenceManyField
                  reference="orders"
                  target="customer_id"
                  perPage={3}
                >
                  <SingleFieldList>
                    <orders.BadgeField source="reference" />
                  </SingleFieldList>
                </ReferenceManyField>
              )}
              className="divide-y rounded-md border"
            />
          </List>
        </ResourceContextProvider>
      </section>
    </div>
  );
}
