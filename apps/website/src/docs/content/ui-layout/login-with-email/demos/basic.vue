<script setup lang="ts">
import { LoginWithEmail, type LoginWithEmailValues } from "@chelone/vue";
import { ref } from "vue";

const signedInAs = ref<string>();

function signIn(values: LoginWithEmailValues): void {
  signedInAs.value = values.email;
}
</script>

<template>
  <!-- `<LoginWithEmail>` collects an email and a password and hands them to your own `onSubmit`, so a custom backend signs the user in. -->
  <div class="mx-auto flex w-full max-w-sm flex-col gap-4">
    <LoginWithEmail
      submit-label="Sign in through onSubmit"
      :on-submit="signIn"
    />
    <p class="text-sm text-muted-foreground">
      {{
        signedInAs
          ? `onSubmit ran for ${signedInAs}`
          : "onSubmit has not run yet."
      }}
    </p>
  </div>
</template>
