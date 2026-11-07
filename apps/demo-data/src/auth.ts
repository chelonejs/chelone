import {
  type AuthProvider,
  type CanAccessParams,
  type CheloneStore,
  canAccessWithPermissions,
  type PermissionMatrixValue,
} from "@chelone/core";
import {
  DEFAULT_ROLE,
  defaultPermissions,
  PERMISSIONS_KEY,
  ROLE_KEY,
} from "./team";

/** The store key holding whether anyone is signed in. Absent means signed in. */
export const SIGNED_IN_KEY = "demo.auth.signedIn";
/** The store key holding the name the signed-in visitor shows as. */
export const USER_KEY = "demo.auth.user";

const DEMO_USER = "Demo User";

/** How long `/auth-callback` waits for a code before it reports there was none. */
export const CALLBACK_PENDING_MS = 8000;

/** The cached auth answers a sign-in or sign-out makes wrong. */
type AuthQuery = "checkAuth" | "getIdentity" | "canAccess";
const AUTH_QUERIES: readonly AuthQuery[] = [
  "checkAuth",
  "getIdentity",
  "canAccess",
];

/**
 * The slice of a query client the provider needs. The demos' query clients
 * cache the auth answers and the provider cannot reach them any other way, so
 * a sign-in or sign-out resets them here. They are reset, not invalidated: an
 * answer cached while signed out is still served, stale, to the page that
 * mounts after the next sign-in, which would act on it. `handleCallback` is
 * left alone: it runs inside that query and would refetch itself.
 */
export interface AuthCache {
  resetQueries(filters: {
    queryKey: readonly ["auth", AuthQuery];
  }): Promise<void>;
}

/**
 * A session with no server: the visitor is signed in until they log out, and
 * any email and password sign them back in. The demos need one so the app
 * bar's user menu renders, since `<UserMenu>` shows nothing without an
 * `authProvider`, and so the login page, the callback and the error screens
 * have something to do.
 *
 * `canAccess` reads the role the visitor browses as and the role matrix from
 * `store`, both set on the Team page. A role the matrix does not list may do
 * nothing, and nobody signed out may do anything. Answers are cached by the
 * query client, so whoever changes either key invalidates the
 * `["auth", "canAccess"]` queries.
 *
 * `handleCallback` reads the URL: `?code=` signs in, `?error=` fails with its
 * `error_description`, and with neither it waits for a code that never comes.
 */
export function makeDemoAuthProvider(
  store: CheloneStore,
  cache?: AuthCache,
): AuthProvider {
  const signedIn = () => store.getItem<boolean>(SIGNED_IN_KEY) ?? true;
  const refresh = async () => {
    await Promise.all(
      AUTH_QUERIES.map((query) =>
        cache?.resetQueries({ queryKey: ["auth", query] }),
      ),
    );
  };
  const signIn = async (name: string) => {
    store.setItem(SIGNED_IN_KEY, true);
    store.setItem(USER_KEY, name);
    await refresh();
  };

  return {
    login: async ({ email }) => {
      await signIn(typeof email === "string" && email ? email : DEMO_USER);
    },
    logout: async () => {
      store.setItem(SIGNED_IN_KEY, false);
      await refresh();
    },
    checkAuth: async () => {
      if (!signedIn()) throw new Error("Not signed in");
    },
    checkError: async () => {},
    getIdentity: async () => {
      if (!signedIn()) throw new Error("Not signed in");
      return {
        id: "demo",
        fullName: store.getItem<string>(USER_KEY) ?? DEMO_USER,
      };
    },
    canAccess: async (params) => {
      if (!signedIn()) return false;
      const role = store.getItem<string>(ROLE_KEY) ?? DEFAULT_ROLE;
      const matrix =
        store.getItem<PermissionMatrixValue>(PERMISSIONS_KEY) ??
        defaultPermissions;
      return canAccessWithPermissions(matrix[role] ?? [], params);
    },
    handleCallback: async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      if (error) throw new Error(params.get("error_description") ?? error);
      if (params.has("code")) {
        await signIn(DEMO_USER);
        return { redirectTo: "/" };
      }
      await new Promise((resolve) => setTimeout(resolve, CALLBACK_PENDING_MS));
      throw new Error("The callback URL carried no code.");
    },
  };
}

/**
 * What opening `pathname` asks the auth provider to allow, or `undefined` for a
 * path no resource owns: `/posts` lists, `/posts/create` creates, `/posts/7`
 * edits and `/posts/7/show` shows.
 */
export function routeAccess(
  pathname: string,
  resources: readonly string[],
): CanAccessParams | undefined {
  const [resource, id, view] = pathname.split("/").filter(Boolean);
  if (resource === undefined || !resources.includes(resource)) return undefined;
  if (id === undefined) return { action: "list", resource };
  if (id === "create") return { action: "create", resource };
  return { action: view === "show" ? "show" : "edit", resource };
}
