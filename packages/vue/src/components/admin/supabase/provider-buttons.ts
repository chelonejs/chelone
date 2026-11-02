/**
 * One sign-in button per Supabase OAuth provider, each a
 * {@link SocialAuthButton} with its icon and the translated
 * `ra-supabase.auth.sign_in_with` label. Built with `defineComponent` because a
 * `.vue` file holds one component. The default slot replaces icon and label.
 */

import { defineComponent, h } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import SocialAuthButton, {
  type SocialAuthButtonProps,
  type SupabaseOAuthProvider,
} from "./social-auth-button.vue";
import {
  AppleIcon,
  AzureIcon,
  BitbucketIcon,
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  GitlabIcon,
  GoogleIcon,
  KeycloakIcon,
  LinkedinIcon,
  NotionIcon,
  SlackIcon,
  SpotifyIcon,
  TwitchIcon,
  TwitterIcon,
  WorkosIcon,
} from "./social-icons";

/** Props for a provider button: those of {@link SocialAuthButton} minus `provider`. */
export type ProviderButtonProps = Omit<SocialAuthButtonProps, "provider">;

function providerButton(
  provider: SupabaseOAuthProvider,
  label: string,
  Icon: typeof AppleIcon,
) {
  return defineComponent<ProviderButtonProps>({
    name: `${label}Button`,
    props: {
      redirect: { type: String, default: undefined },
      disabled: { type: Boolean, default: false },
      class: { type: String, default: undefined },
    },
    setup(props, { slots }) {
      const translate = useTranslate();
      return () =>
        h(
          SocialAuthButton,
          { ...props, provider },
          {
            default: () =>
              slots.default?.() ?? [
                h(Icon),
                translate("ra-supabase.auth.sign_in_with", {
                  provider: label,
                  _: `Sign in with ${label}`,
                }),
              ],
          },
        );
    },
  });
}

export const AppleButton = providerButton("apple", "Apple", AppleIcon);
export const AzureButton = providerButton("azure", "Azure", AzureIcon);
export const BitbucketButton = providerButton(
  "bitbucket",
  "Bitbucket",
  BitbucketIcon,
);
export const DiscordButton = providerButton("discord", "Discord", DiscordIcon);
export const FacebookButton = providerButton(
  "facebook",
  "Facebook",
  FacebookIcon,
);
export const GithubButton = providerButton("github", "Github", GithubIcon);
export const GitlabButton = providerButton("gitlab", "Gitlab", GitlabIcon);
export const GoogleButton = providerButton("google", "Google", GoogleIcon);
export const KeycloakButton = providerButton(
  "keycloak",
  "Keycloak",
  KeycloakIcon,
);
export const LinkedinButton = providerButton(
  "linkedin",
  "Linkedin",
  LinkedinIcon,
);
export const NotionButton = providerButton("notion", "Notion", NotionIcon);
export const SlackButton = providerButton("slack", "Slack", SlackIcon);
export const SpotifyButton = providerButton("spotify", "Spotify", SpotifyIcon);
export const TwitchButton = providerButton("twitch", "Twitch", TwitchIcon);
export const TwitterButton = providerButton("twitter", "Twitter", TwitterIcon);
export const WorkosButton = providerButton("workos", "Workos", WorkosIcon);
