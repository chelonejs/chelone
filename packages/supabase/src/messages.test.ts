import { createI18n } from "@chelone/core";
import { describe, expect, it } from "vitest";
import { supabaseEnglishMessages, supabaseFrenchMessages } from "./index";

describe("supabase messages", () => {
  it("the French catalog has every key the English catalog has", () => {
    expect(Object.keys(supabaseFrenchMessages).sort()).toEqual(
      Object.keys(supabaseEnglishMessages).sort(),
    );
  });

  it("no message in either catalog uses the %{name} form", () => {
    for (const catalog of [supabaseEnglishMessages, supabaseFrenchMessages]) {
      for (const value of Object.values(catalog)) {
        expect(value).not.toMatch(/%\{/);
      }
    }
  });

  it("translating ra-supabase.auth.sign_in_with with a provider fills in {provider}", () => {
    const i18n = createI18n({
      locale: "en",
      messages: { en: supabaseEnglishMessages, fr: supabaseFrenchMessages },
    });
    expect(
      i18n.translate("ra-supabase.auth.sign_in_with", { provider: "GitHub" }),
    ).toBe("Sign in with GitHub");
    i18n.setLocale("fr");
    expect(
      i18n.translate("ra-supabase.auth.sign_in_with", { provider: "GitHub" }),
    ).toBe("Se connecter avec GitHub");
  });
});
