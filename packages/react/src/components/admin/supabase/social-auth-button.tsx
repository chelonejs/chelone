/**
 * `<SocialAuthButton>` and one button per Supabase OAuth provider. A click
 * calls `useLogin()` with the provider and a redirect URL; the Supabase auth
 * provider turns that into `signInWithOAuth`.
 *
 * Ported from shadmin `supabase/social-auth-button.tsx`.
 */

import { errorMessageOf } from "@chelone/core";
import type { SupabaseOAuthProvider } from "@chelone/supabase";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLogin } from "../../../auth-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
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

export type { SupabaseOAuthProvider };

export interface SocialAuthButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "variant"> {
  provider: SupabaseOAuthProvider;
  /** Where the provider sends the user back. Defaults to the current URL. */
  redirect?: string;
  children?: ReactNode;
}

export function SocialAuthButton({
  provider,
  redirect,
  children,
  disabled,
  ...props
}: SocialAuthButtonProps) {
  const login = useLogin();
  const notify = useNotify();

  const handleClick = async () => {
    try {
      await login.mutateAsync({
        provider,
        redirectTo: redirect ?? window.location.toString(),
      });
    } catch (error) {
      // A rejection with nothing is a custom provider declining to start OAuth.
      const message = errorMessageOf(error);
      if (message) {
        notify(message, { type: "error", messageArgs: { _: message } });
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="cursor-pointer"
      {...props}
      disabled={disabled || login.isPending}
      onClick={() => void handleClick()}
    >
      {children}
    </Button>
  );
}

type ProviderButtonProps = Omit<SocialAuthButtonProps, "provider">;

function providerButton(
  provider: SupabaseOAuthProvider,
  label: string,
  Icon: (props: { className?: string }) => ReactNode,
) {
  return function ProviderButton({ children, ...props }: ProviderButtonProps) {
    const translate = useTranslate();
    return (
      <SocialAuthButton provider={provider} {...props}>
        {children ?? (
          <>
            <Icon />
            {translate("ra-supabase.auth.sign_in_with", {
              provider: label,
              _: `Sign in with ${label}`,
            })}
          </>
        )}
      </SocialAuthButton>
    );
  };
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
