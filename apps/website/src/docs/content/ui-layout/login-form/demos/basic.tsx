import type { AuthProvider } from "@chelone/core";
import { CheloneProvider, LoginForm, useCheloneContext } from "@chelone/react";

const staticAuthProvider: AuthProvider = {
  async login() {},
  async logout() {},
  async checkAuth() {},
  async checkError() {},
};

/** `<LoginForm>` shows a disabled email and password form without a login session. */
export default function LoginFormDemo() {
  const context = useCheloneContext();

  return (
    <CheloneProvider {...context} authProvider={staticAuthProvider}>
      <fieldset disabled className="w-full max-w-sm">
        <legend className="mb-4 text-sm text-muted-foreground">
          Sign-in preview
        </legend>
        <LoginForm />
      </fieldset>
    </CheloneProvider>
  );
}
