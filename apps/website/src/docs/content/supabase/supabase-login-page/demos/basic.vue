<script setup lang="ts">
import {
  SupabaseLoginPage,
  type SupabaseOAuthProvider,
} from "@chelone/vue/supabase";
import StubClient from "@/StubClient.vue";

const providers: SupabaseOAuthProvider[] = ["github", "google"];
</script>

<template>
  <!-- `<SupabaseLoginPage>` shows the email form, a forgot password link and a button for each of two providers. `<StubClient>` stands in for the Supabase client, so the page is signed out and no OAuth sign-in leaves the frame. -->
  <StubClient>
    <SupabaseLoginPage :providers="providers" />
  </StubClient>
</template>
