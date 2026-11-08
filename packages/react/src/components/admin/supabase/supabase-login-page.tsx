/**
 * `<SupabaseLoginPage>` — Chelone's `<LoginPage>` with a forgot password link
 * and one OAuth button per provider. Ported from shadmin
 * `supabase/supabase-login-page.tsx`.
 *
 * It takes no `aside`, as `<LoginPage>` has none: compose `<AuthLayout
 * aside={...}>` with `<LoginForm>` and the provider buttons for a split screen.
 * shadmin's `SupabaseLoginForm` is not carried over: `<LoginForm>` calls
 * `authProvider.login({ email, password })`, which the Supabase provider takes.
 */

import { DEFAULT_LOGIN_PATH } from "@chelone/core";
import { forgotPasswordPath } from "@chelone/supabase";
import type { ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { useRouterAdapter } from "../../../router/adapter";
import { LoginForm } from "../auth/login-form";
import { LoginPage, type LoginPageProps } from "../auth/login-page";
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
  type SupabaseOAuthProvider,
  TwitchButton,
  TwitterButton,
  WorkosButton,
} from "./social-auth-button";

export interface SupabaseLoginPageProps
  extends Omit<LoginPageProps, "children"> {
  /** Custom content in place of the form, the link and the buttons. */
  children?: ReactNode;
  /** Hides the email and password form, its divider and the forgot password link. */
  disableEmailPassword?: boolean;
  /** Hides the forgot password link. */
  disableForgotPassword?: boolean;
  /** OAuth providers to show a button for, in order. */
  providers?: SupabaseOAuthProvider[];
}

const providerButtons = {
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

function SupabaseLoginPage(props: SupabaseLoginPageProps) {
  const {
    children,
    disableEmailPassword,
    disableForgotPassword,
    providers = [],
    redirectTo,
    ...rest
  } = props;
  const translate = useTranslate();
  const { Link } = useRouterAdapter();

  return (
    <LoginPage {...rest}>
      {children ?? (
        <>
          {disableEmailPassword ? null : (
            <>
              <LoginForm redirectTo={redirectTo} />
              {disableForgotPassword ? null : (
                <Link
                  to={forgotPasswordPath}
                  className="text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
                >
                  {translate("ra-supabase.auth.forgot_password", {
                    _: "Forgot password?",
                  })}
                </Link>
              )}
            </>
          )}
          {providers.length > 0 ? (
            <div className="flex flex-col gap-4">
              {disableEmailPassword ? null : (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  {translate("chelone.auth.or", { _: "or" })}
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              {providers.map((provider) => {
                const ProviderButton = providerButtons[provider];
                return <ProviderButton key={provider} redirect={redirectTo} />;
              })}
            </div>
          ) : null}
        </>
      )}
    </LoginPage>
  );
}

SupabaseLoginPage.path = DEFAULT_LOGIN_PATH;

export { SupabaseLoginPage };
