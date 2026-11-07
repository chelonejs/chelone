<script setup lang="ts">
/**
 * `<CustomerEdit>` — the customer edit page, the Vue twin of `apps/demo`'s
 * `CustomerEdit`. `<Edit>` fetches the record and seeds the form; the inputs
 * bind to it, a phone, a join date and a plan picker complete the profile, and
 * `<Toolbar>` holds the save and cancel buttons.
 */

import {
  CancelButton,
  DateInput,
  Edit,
  PhoneInput,
  SaveButton,
  SubscriptionPlanPicker,
  TextInput,
  Toolbar,
} from "@chelone/vue";
import { plans } from "./customer-plans";
</script>

<template>
  <Edit resource="customers">
    <div class="flex flex-col gap-4 max-w-xl">
      <TextInput source="name" />
      <TextInput source="email" />
      <TextInput source="city" />
      <PhoneInput source="phone" />
      <DateInput source="joined_on" label="Customer since" />
    </div>
    <div class="mt-4 max-w-4xl">
      <SubscriptionPlanPicker source="plan" :plans="plans" />
    </div>
    <Toolbar>
      <div class="flex gap-2">
        <SaveButton />
        <CancelButton />
      </div>
    </Toolbar>
  </Edit>
</template>
