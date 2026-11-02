// A subpath entry, not part of the barrel: the add-on imports the optional
// `@chelone/supabase` peer, which the main entry must load without.

export {
  ForgotPasswordForm,
  type ForgotPasswordFormProps,
} from "./components/admin/supabase/forgot-password-form";
export {
  ForgotPasswordPage,
  type ForgotPasswordPageProps,
} from "./components/admin/supabase/forgot-password-page";
export {
  SetPasswordForm,
  type SetPasswordFormProps,
} from "./components/admin/supabase/set-password-form";
export {
  SetPasswordPage,
  type SetPasswordPageProps,
} from "./components/admin/supabase/set-password-page";
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
  SlackButton,
  SocialAuthButton,
  type SocialAuthButtonProps,
  SpotifyButton,
  type SupabaseOAuthProvider,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./components/admin/supabase/social-auth-button";
export {
  SupabaseLoginPage,
  type SupabaseLoginPageProps,
} from "./components/admin/supabase/supabase-login-page";
export {
  type UseResetPasswordOptions,
  type UseSetPasswordOptions,
  useResetPassword,
  useSetPassword,
  useSupabaseUrlTokens,
} from "./components/admin/supabase/use-password-recovery";
