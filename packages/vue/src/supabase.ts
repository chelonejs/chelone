// A subpath entry, not part of the barrel: the add-on imports the optional
// `@chelone/supabase` peer, which the main entry must load without.

export {
  default as ForgotPasswordForm,
  type ForgotPasswordFormProps,
} from "./components/admin/supabase/forgot-password-form.vue";
export {
  default as ForgotPasswordPage,
  type ForgotPasswordPageProps,
} from "./components/admin/supabase/forgot-password-page.vue";
export {
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
  type ProviderButtonProps,
  SlackButton,
  SpotifyButton,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./components/admin/supabase/provider-buttons";
export {
  default as SetPasswordForm,
  type SetPasswordFormProps,
} from "./components/admin/supabase/set-password-form.vue";
export {
  default as SetPasswordPage,
  type SetPasswordPageProps,
} from "./components/admin/supabase/set-password-page.vue";
export {
  default as SocialAuthButton,
  type SocialAuthButtonProps,
  type SupabaseOAuthProvider,
} from "./components/admin/supabase/social-auth-button.vue";
export {
  type UseResetPasswordOptions,
  type UseSetPasswordOptions,
  useResetPassword,
  useSetPassword,
  useSupabaseUrlTokens,
} from "./components/admin/supabase/use-password-recovery";
