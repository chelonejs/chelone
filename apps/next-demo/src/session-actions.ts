"use server";

/**
 * The only writers of the session cookie. It is httpOnly, so no script in the
 * browser reads it, and neither action returns its value.
 */

import { cookies } from "next/headers";
import { encodeSession, SESSION_COOKIE } from "./auth";

const DEMO_USER = "Demo User";

/** Any email signs in, as in the other demos; an empty one shows as the demo user. */
export async function signIn(email: string): Promise<void> {
  const user = email.trim() === "" ? DEMO_USER : email.trim();
  (await cookies()).set(SESSION_COOKIE, encodeSession({ user }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
