/**
 * `<AuthCallback>` — a standalone page used as the redirection target for
 * external auth services (OAuth). Ported from shadmin
 * `admin/auth/auth-callback.tsx`; the seams are rewired to `@chelone/react`.
 *
 * Displays a loading indicator while the auth response resolves, then the P6
 * `useHandleAuthCallback` resolver issues the post-login redirect. On failure
 * it renders `<AuthError>`.
 *
 * Chelone divergences:
 * - `useHandleAuthCallback` is the P6 auth-gate resolver: it returns
 *   `{ settled, error }` and OWNS the success redirect (via `useRedirect`), so
 *   this component only branches on `error` and otherwise shows the loader.
 * - shadmin renders a full `<Loading>` feedback component; the loading branch
 *   here is a bare `<Spinner>` (already `role="status"`) with no delay.
 *
 * @example
 * <Admin authCallbackPage={AuthCallback} authProvider={authProvider}>…</Admin>
 */

import { Spinner } from "@/components/ui/spinner";
import { useHandleAuthCallback } from "../../../admin/auth-gate";
import { AuthError } from "./auth-error";

function AuthCallback() {
  const { error } = useHandleAuthCallback();
  if (error) {
    return (
      <AuthError
        message={
          error instanceof Error && error.message ? error.message : undefined
        }
      />
    );
  }
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <Spinner className="size-9" />
    </div>
  );
}

export { AuthCallback };
