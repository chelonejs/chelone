import { Spinner } from "@chelone/react";

/** A static `<AuthCallback>` loading state waits for sign-in without a login session. */
export default function AuthCallbackDemo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Spinner size="large" aria-label="Completing sign-in" />
      <p className="text-sm text-muted-foreground">Completing sign-in...</p>
    </div>
  );
}
