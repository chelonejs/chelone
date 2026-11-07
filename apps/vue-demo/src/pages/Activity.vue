<script lang="ts">
export const title = "Activity";
export const group = "Shop";
</script>

<script setup lang="ts">
/**
 * The Activity page, the Vue twin of `apps/demo`'s: what happened in the shop,
 * newest first, as an infinite feed, with the most recent customers beside it.
 * The feed and the customers are both `<SimpleList>`s; each customer row lists
 * their orders as badges in a `<SingleFieldList>`.
 */

import {
  BadgeField,
  DateField,
  InfiniteList,
  InfinitePagination,
  List,
  ReferenceField,
  ReferenceManyField,
  SimpleList,
  SingleFieldList,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section aria-label="Activity feed">
      <InfiniteList resource="activity" :per-page="8" title="Activity">
        <SimpleList :link-type="false" class="divide-y rounded-md border">
          <template #primary-text="{ record }">
            {{ record.action }} {{ record.resource }} #{{ record.record_id }}
          </template>
          <template #secondary-text>
            <ReferenceField source="actor_id" reference="authors" :link="false">
              <TextField source="name" />
            </ReferenceField>
          </template>
          <template #right-icon>
            <span class="text-sm text-muted-foreground">
              <DateField source="at" show-time />
            </span>
          </template>
        </SimpleList>
        <InfinitePagination />
      </InfiniteList>
    </section>
    <section aria-label="Recent customers">
      <List resource="customers" :per-page="5" title="Recent customers">
        <SimpleList class="divide-y rounded-md border">
          <template #primary-text="{ record }">{{ record.name }}</template>
          <template #secondary-text="{ record }">{{ record.city }}</template>
          <template #tertiary-text>
            <ReferenceManyField
              reference="orders"
              target="customer_id"
              :per-page="3"
            >
              <SingleFieldList>
                <BadgeField source="reference" />
              </SingleFieldList>
            </ReferenceManyField>
          </template>
        </SimpleList>
      </List>
    </section>
  </div>
</template>
