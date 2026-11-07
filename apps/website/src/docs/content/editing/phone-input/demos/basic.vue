<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { PhoneInput } from "@chelone/vue";

const countries = ["US", "GB", "FR", "JP"] as const;
</script>

<template>
  <!-- `<PhoneInput>` splits a stored E.164 number into a country picker and a national-format field. -->
  <div class="w-full max-w-sm">
    <PhoneInput
      source="phone"
      default-country="US"
      :allowed-countries="countries"
      default-value="+14155552671"
    />
  </div>
</template>
