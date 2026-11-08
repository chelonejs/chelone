<script lang="ts">
import type { SupabaseOAuthProvider } from "./social-auth-button.vue";

/** Props for {@link SupabaseLoginPage}. */
export interface SupabaseLoginPageProps {
  /** Hides the email and password form, its divider and the forgot password link. */
  disableEmailPassword?: boolean;
  /** Hides the forgot password link. */
  disableForgotPassword?: boolean;
  /** OAuth providers to show a button for, in order. */
  providers?: SupabaseOAuthProvider[];
  /** Path a successful sign-in redirects to. Forwarded to the form and the buttons. */
  redirectTo?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SupabaseLoginPage>` — Chelone's `<LoginPage>` with a forgot password link
 * and one OAuth button per provider. The Vue twin of `@chelone/react`'s
 * `supabase/supabase-login-page.tsx`.
 *
 * It fills `<LoginPage>`'s default slot, so the redirect of an authenticated
 * user and the title stay. It takes no `aside`: compose `<AuthLayout>` with an
 * `#aside` slot, `<LoginForm>` and the provider buttons for a split screen. A
 * `.vue` component cannot carry a static `path`, so register the route at
 * `/login` yourself.
 *
 * Vue divergence: `@chelone/vue` has no separator primitive, so the "or"
 * divider is two `border-t` lines.
 */

import { forgotPasswordPath } from "@chelone/supabase";
import { computed, type VNode } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import LoginForm from "../auth/login-form.vue";
import LoginPage from "../auth/login-page.vue";
import Link from "../common/link.vue";
import {
  AppleButton,
  AzureButton,
  BitbucketButton,
  DiscordButton,
  FacebookButton,
  GithubButton,
  GitlabButton,
  GoogleButton,
  KeycloakButton,
  LinkedinButton,
  NotionButton,
  SlackButton,
  SpotifyButton,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./provider-buttons";

const buttons = {
  apple: AppleButton,
  azure: AzureButton,
  bitbucket: BitbucketButton,
  discord: DiscordButton,
  facebook: FacebookButton,
  github: GithubButton,
  gitlab: GitlabButton,
  google: GoogleButton,
  keycloak: KeycloakButton,
  linkedin: LinkedinButton,
  notion: NotionButton,
  slack: SlackButton,
  spotify: SpotifyButton,
  twitch: TwitchButton,
  twitter: TwitterButton,
  workos: WorkosButton,
} satisfies Record<SupabaseOAuthProvider, typeof AppleButton>;

const props = defineProps<SupabaseLoginPageProps>();

defineSlots<{
  /** Custom content in place of the form, the link and the buttons. */
  default?: () => VNode[];
}>();

const translate = useTranslate();
const providers = computed(() => props.providers ?? []);
</script>

<template>
  <LoginPage :class="props.class">
    <slot>
      <template v-if="!props.disableEmailPassword">
        <LoginForm :redirect-to="props.redirectTo" />
        <Link
          v-if="!props.disableForgotPassword"
          :to="forgotPasswordPath"
          class="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
        >
          {{
            translate("ra-supabase.auth.forgot_password", {
              _: "Forgot password?",
            })
          }}
        </Link>
      </template>
      <div v-if="providers.length > 0" class="flex flex-col gap-4">
        <div
          v-if="!props.disableEmailPassword"
          class="flex items-center gap-4 text-sm text-muted-foreground"
        >
          <div class="flex-1 border-t" />
          {{ translate("chelone.auth.or", { _: "or" }) }}
          <div class="flex-1 border-t" />
        </div>
        <component
          :is="buttons[provider]"
          v-for="provider in providers"
          :key="provider"
          :redirect="props.redirectTo"
        />
      </div>
    </slot>
  </LoginPage>
</template>
