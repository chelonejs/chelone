<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { PhoneField } from "@chelone/vue";

const record = { id: 1, phone: "+14155552671" };
</script>

<template>
  <!-- `<PhoneField>` formats a phone number as a clickable telephone link. -->
  <PhoneField source="phone" :record="record" />
</template>
