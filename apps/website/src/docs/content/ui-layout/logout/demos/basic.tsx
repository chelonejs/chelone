import type { AuthProvider } from "@chelone/core";
import { CheloneProvider, Logout, useCheloneContext } from "@chelone/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * `<Logout>` calls `useAuthState()` and `useLogout()`, both of which need an
 * `authProvider` the preview ships none of. This re-provides the preview's own
 * services with one whose `checkAuth` resolves, so the item renders as it does
 * for a signed-in user.
 */
const signedIn: AuthProvider = {
  checkAuth: async () => {},
  checkError: async () => {},
  login: async () => {},
  logout: async () => {},
};

function SignedIn({ children }: { children: ReactNode }) {
  const context = useCheloneContext();
  return (
    <CheloneProvider {...context} authProvider={signedIn}>
      {children}
    </CheloneProvider>
  );
}

/** `<Logout>` is the "Log out" row inside the user menu's dropdown, shown open here. */
export default function LogoutDemo() {
  return (
    <SignedIn>
      <DropdownMenu defaultOpen modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            User menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" forceMount>
          <Logout redirectTo="/login" />
        </DropdownMenuContent>
      </DropdownMenu>
    </SignedIn>
  );
}
