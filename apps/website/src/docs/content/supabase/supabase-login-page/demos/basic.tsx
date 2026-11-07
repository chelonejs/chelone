import { SupabaseLoginPage } from "@chelone/react/supabase";
import { StubSupabaseClient } from "@/docs/mdx/stub-supabase-client";

/** `<SupabaseLoginPage>` shows the email form, a forgot password link and a button for each of two providers. */
export default function SupabaseLoginPageDemo() {
  return (
    <StubSupabaseClient>
      <SupabaseLoginPage
        providers={["github", "google"]}
        className="min-h-0 w-full py-6"
      />
    </StubSupabaseClient>
  );
}
