import { SetPasswordPage } from "@chelone/react/supabase";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { StubSupabaseClient } from "@/docs/mdx/stub-supabase-client";

/**
 * `<SetPasswordPage>` reads the tokens a recovery link carries off the URL. The
 * preview is not at such a link, so this puts the tokens on the URL once; the
 * form keeps them and removes them from the URL, as it does for a real link.
 */
export default function SetPasswordPageDemo() {
  // The location as the page opened, so a query or an anchor on the docs URL survives.
  const opened = useRef(useLocation());
  const navigate = useNavigate();
  useEffect(() => {
    const { pathname, search, hash } = opened.current;
    const params = new URLSearchParams(search);
    params.set("access_token", "preview-access");
    params.set("refresh_token", "preview-refresh");
    params.set("type", "recovery");
    navigate(`${pathname}?${params.toString()}${hash}`, { replace: true });
  }, [navigate]);

  return (
    <StubSupabaseClient>
      <SetPasswordPage className="min-h-0 w-full py-6" />
    </StubSupabaseClient>
  );
}
