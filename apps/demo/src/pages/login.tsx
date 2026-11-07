/**
 * Signing in and out. The demo opens signed in; "Log out" in the user menu
 * shows `<LoginPage>` in place of the app, and any email and password sign back
 * in. The forms below are the same ones, run in place: `<LoginForm>` signs in
 * through the auth provider, and `<LoginWithEmail>` hands the credentials to
 * code of the page's own. The screens the auth flow ends on are linked at the
 * bottom.
 */

import { LoginForm, LoginWithEmail, useGetIdentity } from "@chelone/react";
import { useState } from "react";
import { Link } from "react-router";

export const title = "Sign in";
export const group = "Account";

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

export default function SignInPage() {
  const { data: identity } = useGetIdentity();
  const [handedOver, setHandedOver] = useState<string>();

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {identity?.fullName}
          </span>
          . Log out from the user menu to see the login page, and sign back in
          with any email and password.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section
          aria-label="Sign in through the auth provider"
          className="flex flex-col gap-4"
        >
          <div>
            <h2 className="text-sm font-medium">Auth provider</h2>
            <p className="text-sm text-muted-foreground">
              <code>LoginForm</code> calls the provider's <code>login</code>,
              so the name above changes to the email.
            </p>
          </div>
          <LoginForm />
        </section>

        <section
          aria-label="Sign in through your own code"
          className="flex flex-col gap-4"
        >
          <div>
            <h2 className="text-sm font-medium">Your own code</h2>
            <p className="text-sm text-muted-foreground">
              <code>LoginWithEmail</code> calls an <code>onSubmit</code> and
              leaves the session alone.
            </p>
          </div>
          <LoginWithEmail
            submitLabel="Send to onSubmit"
            onSubmit={({ email }) => setHandedOver(email)}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {handedOver
              ? `onSubmit received ${handedOver}.`
              : "onSubmit has not run yet."}
          </p>
        </section>
      </div>

      <section aria-label="Auth screens" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Screens the flow ends on</h2>
        <ul className="divide-y rounded-md border">
          {screens.map(({ to, name, text }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-accent"
              >
                <span className="font-medium">{name}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
