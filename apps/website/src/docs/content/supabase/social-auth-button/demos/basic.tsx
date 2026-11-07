import { Notification } from "@chelone/react";
import {
  GithubButton,
  GoogleButton,
  SocialAuthButton,
} from "@chelone/react/supabase";
import { StubSupabaseClient } from "@/docs/mdx/stub-supabase-client";

/** `<SocialAuthButton>` and the ready-made provider buttons: a click starts the OAuth sign-in, which the stub declines with an error. */
export default function SocialAuthButtonDemo() {
  return (
    <StubSupabaseClient>
      <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
        <GithubButton />
        <GoogleButton />
        <SocialAuthButton provider="keycloak">Company SSO</SocialAuthButton>
      </div>
      <Notification />
    </StubSupabaseClient>
  );
}
