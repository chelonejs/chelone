/**
 * The Supabase auth pages: login with email and OAuth buttons, forgot password
 * and set password. They are routes of their own under `/auth/`, outside the
 * layout (see `auth-routes.tsx`), and run against a stub client, so this page
 * only links to them.
 */

import { Link } from "react-router";
import { recoveryLink } from "../auth-routes";

export const title = "Supabase auth";
export const group = "Account";

const pages = [
  {
    to: "/auth/login",
    name: "Login",
    text: "Email and password, a forgot password link and the GitHub and Google buttons.",
  },
  {
    to: "/auth/forgot-password",
    name: "Forgot password",
    text: "Asks for an email and sends the reset link.",
  },
  {
    to: recoveryLink,
    name: "Set password",
    text: "Where a recovery link ends. The link carries the tokens the form reads.",
  },
];

export default function SupabaseAuthPage() {
  return (
    <section aria-label="Supabase auth pages" className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Supabase auth</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        These pages run against a stub client: any email and password sign in,
        no email is sent and the OAuth buttons report that they are off.
      </p>
      <ul className="mt-6 divide-y rounded-md border">
        {pages.map(({ to, name, text }) => (
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
  );
}
