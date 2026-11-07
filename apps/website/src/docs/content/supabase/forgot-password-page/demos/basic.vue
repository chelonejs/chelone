<script setup lang="ts">
import { ForgotPasswordPage } from "@chelone/vue/supabase";
import StubClient from "@/StubClient.vue";
</script>

<template>
  <!-- `<ForgotPasswordPage>` asks for an email and sends the reset link. `<StubClient>` stands in for the Supabase client, so no email is sent. -->
  <StubClient>
    <ForgotPasswordPage />
  </StubClient>
</template>
