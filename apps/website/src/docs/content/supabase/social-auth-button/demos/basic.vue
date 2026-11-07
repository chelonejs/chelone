<script setup lang="ts">
import { Notification } from "@chelone/vue";
import {
  GithubButton,
  GoogleButton,
  SocialAuthButton,
} from "@chelone/vue/supabase";
import StubClient from "@/StubClient.vue";
</script>

<template>
  <!-- `<SocialAuthButton>` and the ready-made provider buttons: a click starts the OAuth sign-in, which the stub declines with an error. -->
  <StubClient>
    <!-- Three buttons are shorter than the preview frame, which would leave them
         at its top edge. `min-h-dvh` is the frame's own height, so they sit in
         the middle of it. -->
    <div class="mx-auto flex min-h-dvh w-full max-w-xs flex-col justify-center gap-3">
      <GithubButton />
      <GoogleButton />
      <SocialAuthButton provider="keycloak">Company SSO</SocialAuthButton>
    </div>
    <Notification />
  </StubClient>
</template>
