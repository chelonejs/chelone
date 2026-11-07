<script lang="ts">
export const title = "Sign in";
export const group = "Account";
</script>

<script setup lang="ts">
/**
 * Signing in and out, the Vue twin of `apps/demo`'s page. The demo opens signed
 * in; "Logout" in the user menu shows `<LoginPage>` in place of the app, and any
 * email and password sign back in. The forms below are the same ones, run in
 * place: `<LoginForm>` signs in through the auth provider, and
 * `<LoginWithEmail>` hands the credentials to code of the page's own. The
 * screens the auth flow ends on are linked at the bottom.
 */

import { LoginForm, LoginWithEmail, useGetIdentity } from "@chelone/vue";
import { ref } from "vue";
import { RouterLink } from "vue-router";

const screens = [
  {
    to: "/auth-callback?code=demo",
    name: "Auth callback with a code",
    text: "Where an OAuth provider sends the visitor back. The code signs in and goes home.",
  },
  {
    to: "/auth-callback?error=access_denied&error_description=You%20cancelled%20the%20sign-in.",
    name: "Auth callback with an error",
    text: "The provider reports a failure, so the callback shows the auth error.",
  },
  {
    to: "/authentication-error",
    name: "Authentication error",
    text: "The screen for a session that is no longer valid.",
  },
  {
    to: "/access-denied",
    name: "Access denied",
    text: "Where a role that may not open a page lands. Browse as viewer on the Team page and open Create post.",
  },
];

const { data: identity } = useGetIdentity();
const handedOver = ref<string>();
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-8">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p class="text-muted-foreground">
        Signed in as
        <span class="font-medium text-foreground">{{ identity?.fullName }}</span
        >. Log out from the user menu to see the login page, and sign back in
        with any email and password.
      </p>
    </header>

    <div class="grid gap-8 md:grid-cols-2">
      <section
        aria-label="Sign in through the auth provider"
        class="flex flex-col gap-4"
      >
        <div>
          <h2 class="text-sm font-medium">Auth provider</h2>
          <p class="text-sm text-muted-foreground">
            <code>LoginForm</code> calls the provider's <code>login</code>, so
            the name above changes to the email.
          </p>
        </div>
        <LoginForm />
      </section>

      <section
        aria-label="Sign in through your own code"
        class="flex flex-col gap-4"
      >
        <div>
          <h2 class="text-sm font-medium">Your own code</h2>
          <p class="text-sm text-muted-foreground">
            <code>LoginWithEmail</code> calls an <code>onSubmit</code> and
            leaves the session alone.
          </p>
        </div>
        <LoginWithEmail
          submit-label="Send to onSubmit"
          :on-submit="({ email }) => { handedOver = email; }"
        />
        <p class="text-sm text-muted-foreground" aria-live="polite">
          {{
            handedOver
              ? `onSubmit received ${handedOver}.`
              : "onSubmit has not run yet."
          }}
        </p>
      </section>
    </div>

    <section aria-label="Auth screens" class="flex flex-col gap-2">
      <h2 class="text-sm font-medium">Screens the flow ends on</h2>
      <ul class="divide-y rounded-md border">
        <li v-for="screen in screens" :key="screen.to">
          <RouterLink
            :to="screen.to"
            class="flex flex-col gap-1 px-4 py-3 hover:bg-accent"
          >
            <span class="font-medium">{{ screen.name }}</span>
            <span class="text-sm text-muted-foreground">{{ screen.text }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
