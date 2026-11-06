import type { MetaEntry } from "@/docs/types";

// The pages a Supabase admin mounts, then the button they are built from. The
// forms, the sixteen provider buttons and the three hooks are covered by the
// guide in app-config, so they get no page of their own.
export default [
  {
    category: "Pages",
    slugs: ["supabase-login-page", "forgot-password-page", "set-password-page"],
  },
  { category: "Buttons", slugs: ["social-auth-button"] },
] satisfies MetaEntry[];
