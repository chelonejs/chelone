/**
 * The demo's session: `makeDemoAuthProvider` over a `CheloneStore` that reads
 * an httpOnly cookie. The cookie is the only state, so the proxy, a server
 * component and the browser's first render all answer from the same request.
 * Absent or unreadable means signed out, unlike the other demos, where a fresh
 * visitor starts signed in.
 *
 * Only a server action writes the cookie (`session-actions.ts`); the browser
 * never sees its value, only the `Session` the layout reads from it.
 */

import {
  type AuthProvider,
  createStore,
  type StoreAdapter,
} from "@chelone/core";
import {
  makeDemoAuthProvider,
  SIGNED_IN_KEY,
  USER_KEY,
} from "@chelone/demo-data";

export const SESSION_COOKIE = "next-demo-session";

/** What the browser may know about the session: who, never the cookie value. */
export interface Session {
  user: string;
}

/** The part of `NextRequest.cookies` and `cookies()` the session reads. */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

function isSession(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "user" in value &&
    typeof value.user === "string"
  );
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

/** The session a cookie value holds, or `null` for a missing or forged one. */
function decodeSession(value: string | undefined): Session | null {
  if (value === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readSession(cookies: CookieReader): Session | null {
  return decodeSession(cookies.get(SESSION_COOKIE)?.value);
}

/** The cookie as the keys the demo auth provider reads. It is read-only. */
function cookieAdapter(cookies: CookieReader): StoreAdapter {
  const readOnly = () => {
    throw new Error("The session cookie is written by a server action.");
  };
  return {
    getItem: (key) => {
      const session = readSession(cookies);
      if (key === SIGNED_IN_KEY) return session !== null;
      if (key === USER_KEY) return session?.user;
      return undefined;
    },
    setItem: readOnly,
    removeItem: readOnly,
  };
}

/** The auth provider for one request, answering from its cookies. */
export function requestAuthProvider(cookies: CookieReader): AuthProvider {
  return makeDemoAuthProvider(createStore(cookieAdapter(cookies)));
}
