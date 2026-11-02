// A subpath entry, not part of the barrel: the add-on imports the optional
// `@chelone/supabase` peer, which the main entry must load without.
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
  default as SocialAuthButton,
  type SocialAuthButtonProps,
  type SupabaseOAuthProvider,
} from "./components/admin/supabase/social-auth-button.vue";
