import { ForgotPasswordPage } from "@chelone/react/supabase";
import { StubSupabaseClient } from "@/docs/mdx/stub-supabase-client";

/** `<ForgotPasswordPage>` asks for an email and sends the reset link. */
export default function ForgotPasswordPageDemo() {
  return (
    <StubSupabaseClient>
      <ForgotPasswordPage className="min-h-0 w-full py-6" />
    </StubSupabaseClient>
  );
}
