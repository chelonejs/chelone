import {
  type AuthProvider,
  canAccessWithPermissions,
  type Permission,
} from "@chelone/core";
import { CanAccess, CheloneProvider, useCheloneContext } from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const grants: Record<string, Permission[]> = {
  editor: [{ resource: "posts", action: ["list", "show", "edit"] }],
  viewer: [{ resource: "posts", action: ["list", "show"] }],
};

function authProviderFor(role: string): AuthProvider {
  return {
    checkAuth: async () => {},
    checkError: async () => {},
    login: async () => {},
    logout: async () => {},
    canAccess: async (params) =>
      canAccessWithPermissions(grants[role] ?? [], params),
  };
}

/**
 * `<CanAccess>` reads the answer to `authProvider.canAccess` through the query
 * client, which caches it. A fresh client and provider per role keep the demo's
 * switch honest: `key={role}` below remounts this.
 */
function SignedInAs({ role }: { role: string }) {
  const context = useCheloneContext();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [authProvider] = useState(() => authProviderFor(role));

  return (
    <CheloneProvider
      {...context}
      queryClient={queryClient}
      authProvider={authProvider}
    >
      <CanAccess
        action="edit"
        resource="posts"
        accessDenied={
          <p className="text-sm text-muted-foreground">
            The {role} role cannot edit posts.
          </p>
        }
      >
        <section
          aria-label="Post tools"
          className="rounded-md border p-4 text-sm"
        >
          The {role} role can edit posts, so the tools show.
        </section>
      </CanAccess>
    </CheloneProvider>
  );
}

/** `<CanAccess>` shows its children only to a role with `edit` on `posts`. */
export default function CanAccessDemo() {
  const [role, setRole] = useState("editor");

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        {Object.keys(grants).map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant={name === role ? "default" : "outline"}
            aria-pressed={name === role}
            onClick={() => setRole(name)}
          >
            {name}
          </Button>
        ))}
      </div>
      <SignedInAs key={role} role={role} />
    </div>
  );
}
