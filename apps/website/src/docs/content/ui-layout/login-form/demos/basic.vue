<script setup lang="ts">
import { LoginForm } from "@chelone/vue";
</script>

<template>
  <!-- `<LoginForm>` shows a disabled email and password form: the fieldset keeps the preview from signing anyone in. -->
  <fieldset disabled class="mx-auto w-full max-w-sm">
    <legend class="mb-4 text-sm text-muted-foreground">Sign-in preview</legend>
    <LoginForm />
  </fieldset>
</template>
