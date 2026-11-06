import type { AuthProvider } from "@chelone/core";
import { CheloneProvider, UserMenu, useCheloneContext } from "@chelone/react";
import type { ReactNode } from "react";

const signedIn: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada Lovelace" }),
};

/** The preview has no login session, so this adds a signed-in auth provider. */
function WithSession({ children }: { children: ReactNode }) {
  const { dataProvider, queryClient, store, i18n, notifications, resources } =
    useCheloneContext();
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      i18n={i18n}
      notifications={notifications}
      resources={resources}
      authProvider={signedIn}
    >
      {children}
    </CheloneProvider>
  );
}

/** `<UserMenu>` is the avatar button of a signed-in "Ada Lovelace", opening a menu with Log out. */
export default function UserMenuDemo() {
  return (
    <WithSession>
      <UserMenu />
    </WithSession>
  );
}
