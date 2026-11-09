/**
 * The Start demo's session: one httpOnly cookie, read and written through server
 * functions.
 *
 * `apps/demo` keeps its session in localStorage (`makeDemoStore`). Start renders
 * on the server, which has no localStorage to read, so that store would let the
 * server render a page the browser then hides. A cookie is the one thing both
 * sides see: the server reads the request's own, and the browser reads it by
 * calling the same server function, which answers from the cookie the browser
 * sends. So `requireAuthBeforeLoad` gives the same answer on both sides.
 *
 * The token is a marker, not a credential: this demo has no accounts, and any
 * email and password sign in, as in `apps/demo`.
 */

import { type AuthProvider, createStore } from "@chelone/core";
import {
  makeDemoAuthProvider,
  SIGNED_IN_KEY,
  USER_KEY,
} from "@chelone/demo-data";
import type { QueryClient } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** The cookie the session lives in. `httpOnly`: the page cannot read it back. */
export const SESSION_COOKIE = "start-demo-session";

const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

/** A signed-in visitor: the cookie's opaque token and the name to show. */
export interface DemoSession {
  token: string;
  user: string;
}

/**
 * Where a session is read from and written to. The app runs on
 * {@link cookieSessionGateway}; a test runs on {@link memorySessionGateway},
 * which keeps the session in a variable so the suite needs no server.
 */
export interface SessionGateway {
  read(): Promise<DemoSession | undefined>;
  write(session: DemoSession | undefined): Promise<void>;
}

/** `token.user`, the name percent-encoded so the cookie holds one value. */
export function encodeSessionCookie(session: DemoSession): string {
  return `${session.token}.${encodeURIComponent(session.user)}`;
}

/**
 * The cookie's value back into a session, or `undefined` for a signed-out
 * visitor. A request can carry a hand-written cookie, so this never throws and
 * never runs what the value holds: a session name is only ever shown as text.
 */
export function parseSessionCookie(
  value: string | undefined,
): DemoSession | undefined {
  if (value === undefined || value === "") return undefined;
  const dot = value.indexOf(".");
  const token = dot === -1 ? value : value.slice(0, dot);
  if (token === "") return undefined;
  return { token, user: decodeName(dot === -1 ? "" : value.slice(dot + 1)) };
}

function decodeName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * `@tanstack/react-start/server` is server-only, and Start's import protection
 * fails the client build on a static import of it — and this file is in the
 * client graph, because the router imports it. The cookie helpers come in
 * inside the server function bodies instead, which Start compiles into the
 * server-only half of this file.
 */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

const readSessionCookie = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getCookie } = await import("@tanstack/react-start/server");
    return getCookie(SESSION_COOKIE) ?? "";
  },
);

const writeSessionCookie = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), user: z.string() }))
  .handler(async ({ data }) => {
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(
      SESSION_COOKIE,
      encodeSessionCookie(data),
      cookieOptions(SESSION_MAX_AGE_SECONDS),
    );
  });

const clearSessionCookie = createServerFn({ method: "POST" }).handler(
  async () => {
    const { setCookie } = await import("@tanstack/react-start/server");
    setCookie(SESSION_COOKIE, "", cookieOptions(0));
  },
);

/** The gateway the app runs on. */
export const cookieSessionGateway: SessionGateway = {
  read: async () => parseSessionCookie(await readSessionCookie()),
  write: async (session) => {
    if (session === undefined) {
      await clearSessionCookie();
      return;
    }
    await writeSessionCookie({ data: session });
  },
};

/** A gateway that keeps the session in a variable, for the tests. */
export function memorySessionGateway(seed?: DemoSession): SessionGateway {
  let session: DemoSession | undefined = seed;
  return {
    read: async () => session,
    write: async (next) => {
      session = next;
    },
  };
}

/**
 * `makeDemoAuthProvider` over a store that reads and writes the session: it
 * answers from the session seeded at router creation, and a sign-in or sign-out
 * writes the new one through the gateway before it resolves.
 *
 * The write is a chain, not a call per key: `makeDemoAuthProvider` signs someone
 * in with two `store.setItem` calls, and only the last one holds the finished
 * session.
 */
export async function makeSessionAuthProvider(
  queryClient: QueryClient,
  gateway: SessionGateway,
): Promise<AuthProvider> {
  let session: DemoSession | undefined = await gateway.read();
  let written: Promise<void> = Promise.resolve();

  const save = (next: DemoSession | undefined) => {
    session = next;
    written = written.then(() => gateway.write(next));
  };

  const store = createStore({
    getItem: (key) => {
      if (key === SIGNED_IN_KEY) return session !== undefined;
      if (key === USER_KEY) return session?.user;
      return undefined;
    },
    setItem: (key, value) => {
      if (key === SIGNED_IN_KEY) {
        save(value === true ? (session ?? newSession()) : undefined);
        return;
      }
      if (key === USER_KEY && typeof value === "string" && session) {
        save({ ...session, user: value });
      }
    },
    removeItem: (key) => {
      if (key === SIGNED_IN_KEY) save(undefined);
    },
  });

  const demo = makeDemoAuthProvider(store, queryClient);
  return {
    ...demo,
    login: async (params) => {
      await demo.login(params);
      await written;
    },
    logout: async (params) => {
      await demo.logout(params);
      await written;
    },
    handleCallback: async () => {
      const result = await demo.handleCallback?.();
      await written;
      return result;
    },
  };
}

function newSession(): DemoSession {
  return { token: crypto.randomUUID(), user: "" };
}
