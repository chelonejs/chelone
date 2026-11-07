<script setup lang="ts">
import { AuthLayout, Button, FieldLabel, Input } from "@chelone/vue";
</script>

<template>
  <!-- `<AuthLayout>` centres a static sign-in form beneath a welcome heading: the form goes in the default slot. -->
  <AuthLayout
    title="Welcome back"
    subtitle="Sign in to your account."
    class="py-6"
  >
    <fieldset disabled aria-label="Sign-in form preview" class="space-y-4">
      <div class="space-y-2">
        <FieldLabel html-for="preview-login-email">Email</FieldLabel>
        <Input
          id="preview-login-email"
          type="email"
          placeholder="ada@example.com"
        />
      </div>
      <div class="space-y-2">
        <FieldLabel html-for="preview-login-password">Password</FieldLabel>
        <Input id="preview-login-password" type="password" />
      </div>
      <Button class="w-full" type="button">Sign in</Button>
    </fieldset>
  </AuthLayout>
</template>
