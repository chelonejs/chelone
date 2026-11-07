<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
/** `<PasswordInput>` hides the value behind dots until the reader clicks the eye button. */

import { PasswordInput } from "@chelone/vue";
</script>

<template>
  <div class="w-full max-w-xs">
    <PasswordInput source="password" default-value="hunter2!" />
  </div>
</template>
