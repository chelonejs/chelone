/**
 * `<Admin>` sets the shell's writing direction from the active locale: `dir` on
 * `<html>`, so a right-to-left locale such as Arabic renders right to left, and
 * back to `ltr` when the app switches. The shell also carries the direction to
 * Radix through `<DirectionProvider>`, which the menus and popovers read.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSetLocale } from "../i18n-hooks";
import { Admin } from "./admin";
import { AdminDashboard } from "./slots";

const dataProvider = fakeDataProvider({});

const messages = {
  en: defineMessages({ "demo.title": "Posts" }),
  ar: defineMessages({ "demo.title": "منشورات" }),
};

function makeI18n(locale: string) {
  return createI18n({ locale, messages });
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** The app's own locale switch, riding in the dashboard slot. */
function LocaleSwitch() {
  const setLocale = useSetLocale();
  return (
    <div>
      <button type="button" onClick={() => setLocale("ar")}>
        العربية
      </button>
      <button type="button" onClick={() => setLocale("en")}>
        English
      </button>
    </div>
  );
}

function dirOfRoot(): string | null {
  return document.documentElement.getAttribute("dir");
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("dir");
});

describe("<Admin> — dir from the locale", () => {
  it("sets dir=ltr on the root for an English locale", () => {
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n("en")}
      >
        <AdminDashboard>
          <LocaleSwitch />
        </AdminDashboard>
      </Admin>,
    );
    expect(dirOfRoot()).toBe("ltr");
  });

  it("sets dir=rtl on the root when the locale switches to Arabic, and back to ltr", () => {
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n("en")}
      >
        <AdminDashboard>
          <LocaleSwitch />
        </AdminDashboard>
      </Admin>,
    );

    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(dirOfRoot()).toBe("rtl");

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(dirOfRoot()).toBe("ltr");
  });

  it("mounts with dir=rtl when the app starts on a right-to-left locale", () => {
    render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n("ar")}
      >
        <AdminDashboard>
          <LocaleSwitch />
        </AdminDashboard>
      </Admin>,
    );
    expect(dirOfRoot()).toBe("rtl");
  });

  it("sets dir=ltr when <Admin> builds its own English i18n", () => {
    render(
      <Admin dataProvider={dataProvider} queryClient={makeQueryClient()}>
        <AdminDashboard>
          <div>dash</div>
        </AdminDashboard>
      </Admin>,
    );
    expect(dirOfRoot()).toBe("ltr");
  });

  it("puts back the dir the host set when the shell unmounts", () => {
    document.documentElement.setAttribute("dir", "rtl");
    const { unmount } = render(
      <Admin
        dataProvider={dataProvider}
        queryClient={makeQueryClient()}
        i18n={makeI18n("en")}
      >
        <AdminDashboard>
          <div>dash</div>
        </AdminDashboard>
      </Admin>,
    );
    expect(dirOfRoot()).toBe("ltr");
    unmount();
    expect(dirOfRoot()).toBe("rtl");
  });
});
