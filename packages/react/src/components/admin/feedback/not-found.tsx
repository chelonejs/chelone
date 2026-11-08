/**
 * `<NotFound>` — the page for an unknown URL, meant for `<Admin.CatchAll>`.
 * Ported from shadmin `feedback/not-found.tsx`.
 *
 * Chelone divergences:
 * - shadmin's `<Translate>` and `useAuthenticated` from shadmin-core become
 *   `translate(X, { _: fallback })` and chelone's `useAuthenticated` from
 *   `admin/auth-gate`.
 * - The back button goes through the router adapter's `useNavigate`, so a
 *   basename and a non-browser router are respected.
 * - shadmin accepts a `title` prop and ignores it; here a string `title`
 *   overrides the portal title.
 */

import { SearchX } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthenticated } from "../../../admin/auth-gate";
import { useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";
import { useNavigate } from "../../../router/nav-hooks";
import { Title } from "../layout/title";
import { Loading } from "./loading";

interface NotFoundProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Overrides the page title shown in the app bar. Translated if a key. */
  title?: string;
}

/**
 * The page shown for a URL no route matches. Checks authentication first, so a
 * signed-out visitor is sent to login before seeing it.
 *
 * @example
 * import { Admin, NotFound } from "@chelone/react";
 *
 * const App = () => (
 *   <Admin dataProvider={dp}>
 *     <Admin.CatchAll>
 *       <NotFound />
 *     </Admin.CatchAll>
 *   </Admin>
 * );
 */
function NotFound(props: NotFoundProps) {
  // `useAuthenticated` throws without an authProvider (it calls `useLogout`),
  // so an app with no auth skips the gate rather than crashing its 404 page.
  const { authProvider } = useCheloneContext();
  return authProvider ? (
    <GatedNotFound {...props} />
  ) : (
    <NotFoundPage {...props} />
  );
}

function GatedNotFound(props: NotFoundProps) {
  const { isPending } = useAuthenticated();
  return isPending ? <Loading /> : <NotFoundPage {...props} />;
}

function NotFoundPage(props: NotFoundProps) {
  const { title, className, ...rest } = props;
  const translate = useTranslate();
  const navigate = useNavigate();
  const heading = translate("chelone.page.not_found", { _: "Not Found" });

  return (
    <div
      className={cn("flex flex-col items-center md:p-16 gap-5", className)}
      {...rest}
    >
      <Title title={title} defaultTitle={heading} />
      <h1 className="flex items-center text-3xl mt-5 mb-5 gap-3">
        <SearchX className="w-[2em] h-[2em]" />
        {heading}
      </h1>
      <p>
        {translate("chelone.message.not_found", {
          _: "The page you requested cannot be found.",
        })}
      </p>
      <div className="mt-8">
        <Button type="button" onClick={() => navigate(-1)}>
          {translate("chelone.action.back", { _: "Back" })}
        </Button>
      </div>
    </div>
  );
}

export { NotFound, type NotFoundProps };
