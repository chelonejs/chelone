/**
 * `<Error>` — the app-wide error page rendered by `<ShellErrorBoundary>` when a
 * route crashes. Ported from shadmin `feedback/error.tsx`; the seams are:
 *
 * - **Fallback contract.** shadmin extends `react-error-boundary`'s
 *   `FallbackProps`; chelone deliberately ships NO `react-error-boundary` dep
 *   (its boundary is the in-house class in `admin/error-boundary.tsx`). This
 *   component therefore consumes chelone's own `ErrorFallbackProps`
 *   (`{ error, errorInfo, resetErrorBoundary }`), so it drops straight into the
 *   `<Admin.Error>` slot / a `<ShellErrorBoundary fallback>` render function.
 * - **Location-reset.** shadmin calls `useResetErrorBoundaryOnLocationChange`
 *   here; chelone's `<ShellErrorBoundary>` already owns that reset (an effect on
 *   `location.pathname`), so the call is DROPPED — resetting here would be a
 *   second, redundant mechanism.
 * - **i18n.** `<Translate i18nKey=X>fallback</>` → `translate(X, { _: fallback })`
 *   (chelone has no `<Translate>` component).
 * - **Dev gate.** shadmin gates the stack-trace/help block on
 *   `import.meta.env.DEV` (a Vite-only flag chelone doesn't type). Rewired to
 *   chelone's bundler-agnostic `process.env.NODE_ENV !== "production"` idiom
 *   (mirroring `util/warning.ts`), tree-shaken from production builds.
 * - **Branding.** shadmin URLs are rebranded to Chelone.
 */

import { CircleAlert, History } from "lucide-react";
import type { ComponentType, HtmlHTMLAttributes, ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { ErrorFallbackProps } from "../../../admin/error-boundary";
import { useTranslate } from "../../../i18n-hooks";
import { Title } from "../layout/title";

// Bundler-replaced dev/prod flag (Vite/webpack/esbuild inline it). Chelone ships
// no `@types/node`, so a minimal ambient declaration keeps the reference typed
// without pulling in Node's types — mirrors `util/warning.ts`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/**
 * App-wide error component for displaying error boundaries.
 *
 * Displays the (translated) error heading + message and a back button. In
 * development, also shows the component stack trace in an expandable accordion.
 *
 * @example
 * import { Admin } from "@chelone/react";
 * import { Error } from "@chelone/react";
 *
 * const App = () => (
 *   <Admin dataProvider={dp}>
 *     <Admin.Error>{(props) => <Error {...props} />}</Admin.Error>
 *   </Admin>
 * );
 */
function ErrorPage(props: InternalErrorProps) {
  const {
    error,
    errorInfo,
    resetErrorBoundary,
    errorComponent,
    title,
    ...rest
  } = props;

  const translate = useTranslate();

  if (errorComponent) {
    const ErrorComponent = errorComponent;
    return (
      <ErrorComponent
        error={error}
        errorInfo={errorInfo}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
  }

  const errorMessage: string =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? (error.message ?? "")
      : typeof error === "string"
        ? error
        : String(error ?? "Unknown error");

  return (
    <div className="flex flex-col items-center md:p-16 gap-5" {...rest}>
      {title ? (
        <Title defaultTitle={typeof title === "string" ? title : undefined} />
      ) : null}
      <h1 className="flex items-center text-3xl mt-5 mb-5 gap-3" role="alert">
        <CircleAlert className="w-[2em] h-[2em]" />
        {translate("chelone.page.error", { _: "Something Went Wrong" })}
      </h1>
      <div>
        {translate("chelone.message.error", {
          _: "A client error occurred and your request couldn't be completed.",
        })}
      </div>
      {IS_DEV && (
        <>
          <Accordion
            type="multiple"
            className="mt-1 p-2 bg-secondary w-full max-w-150"
          >
            <AccordionItem value="error">
              <AccordionTrigger className="py-2">
                {translate(errorMessage, { _: errorMessage })}
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap pt-1">
                <pre className="text-xs">{errorInfo?.componentStack}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-center ">
            Need help with this error? Try the following:
          </p>
          <div>
            <ul className="list-disc">
              <li>
                Check the{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://chelone.dev/docs"
                >
                  Chelone documentation
                </a>
              </li>
              <li>
                Search on{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://stackoverflow.com/questions/tagged/chelone"
                >
                  StackOverflow
                </a>{" "}
                for community answers
              </li>
              <li>
                Get help from the core team via{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://chelone.dev/"
                >
                  Chelone
                </a>
              </li>
            </ul>
          </div>
        </>
      )}
      <div className="mt-8">
        <Button onClick={goBack}>
          <History />
          {translate("chelone.action.back", { _: "Back" })}
        </Button>
      </div>
    </div>
  );
}

interface InternalErrorProps
  extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "title" | "onError">,
    ErrorFallbackProps {
  className?: string;
  errorComponent?: ComponentType<ErrorProps>;
  /**
   * When provided, injects a `<Title>` portal to update the app-bar page title.
   * Pass `false` to explicitly suppress a title.
   */
  title?: ReactNode | string | false;
}

interface ErrorProps extends ErrorFallbackProps {
  /**
   * When provided, injects a `<Title>` portal to update the app-bar page title.
   * Pass `false` to explicitly suppress a title.
   */
  title?: ReactNode | string | false;
}

function goBack() {
  window.history.go(-1);
}

// Exported as `Error` for react-admin `<Error>` API parity (shadmin ships the
// same public name). The internal declaration is `ErrorPage` so the file never
// shadows the global `Error` (biome `noShadowRestrictedNames`).
export { ErrorPage as Error, type ErrorProps };
