import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import ForgotPasswordPageDemo from "../content/supabase/forgot-password-page/demos/basic";
import SetPasswordPageDemo from "../content/supabase/set-password-page/demos/basic";
import SocialAuthButtonDemo from "../content/supabase/social-auth-button/demos/basic";
import SupabaseLoginPageDemo from "../content/supabase/supabase-login-page/demos/basic";
import { PreviewProvider } from "./preview-provider";

afterEach(cleanup);

function Where() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="where">{`${pathname}${search}${hash}`}</output>;
}

function mount(Demo: () => React.ReactNode, entry = "/docs/preview") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PreviewProvider>
        <Demo />
        <Where />
      </PreviewProvider>
    </MemoryRouter>,
  );
}

describe("the Supabase page demos", () => {
  it("the login page shows the form, the forgot password link and the two provider buttons", async () => {
    mount(SupabaseLoginPageDemo);

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sign in with Github" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeTruthy();
  });

  it("the forgot password page asks for an email", async () => {
    mount(ForgotPasswordPageDemo);

    expect(
      await screen.findByRole("heading", { name: "Forgot your password?" }),
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /Email/ })).toBeTruthy();
  });

  it("the set password page shows the form, since the demo carries a recovery link's tokens", async () => {
    mount(SetPasswordPageDemo);

    expect(
      await screen.findByRole("heading", { name: "Choose your password" }),
    ).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Back to login" })).toBeNull();
  });

  it("the set password demo keeps the docs URL's query and anchor and leaves no token on it", async () => {
    mount(SetPasswordPageDemo, "/docs/preview?tab=2#some-heading");

    expect(await screen.findByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe(
      "/docs/preview?tab=2#some-heading",
    );
  });

  it("a provider button reports that the stub declines the sign-in", async () => {
    mount(SocialAuthButtonDemo);

    fireEvent.click(
      await screen.findByRole("button", { name: "Sign in with Github" }),
    );

    expect(await screen.findByText(/makes no network call/)).toBeTruthy();
  });
});
