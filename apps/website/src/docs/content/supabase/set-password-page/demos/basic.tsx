import { SetPasswordPage } from "@chelone/react/supabase";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { StubSupabaseClient } from "@/docs/mdx/stub-supabase-client";

/**
 * `<SetPasswordPage>` reads the tokens a recovery link carries off the URL. The
 * preview is not at such a link, so this puts the tokens on the URL once; the
 * form keeps them and removes them from the URL, as it does for a real link.
 */
export default function SetPasswordPageDemo() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(
      `${pathname}?access_token=preview-access&refresh_token=preview-refresh&type=recovery`,
      { replace: true },
    );
  }, [pathname, navigate]);

  return (
    <StubSupabaseClient>
      <SetPasswordPage className="min-h-0 w-full py-6" />
    </StubSupabaseClient>
  );
}
