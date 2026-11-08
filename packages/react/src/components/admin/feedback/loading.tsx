/**
 * `<Loading>` — the deferred loading indicator for slow element/page loads.
 * Ported from shadmin `feedback/loading.tsx`; the ONE seam (shadmin-core's
 * `useTimeout` + the `<Translate>` component) is rewired to `@chelone/react`:
 * `useTimeout` from the compat hooks, and `<Translate i18nKey=X>fallback</>`
 * → `translate(X, { _: fallback })` (chelone has no `<Translate>` component —
 * the idiom is the `useTranslate()` function with the polyglot `_` fallback).
 *
 * Works as a fallback for React Suspense boundaries and is shown by the default
 * `<Layout>` when a page load exceeds the `delay` (default 1s).
 */

import { Spinner } from "@/components/admin/feedback/spinner";
import { useTimeout } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";

/**
 * Loading indicator used for slow element or page loads.
 *
 * Displays a spinner and customizable loading messages. Only appears after
 * `delay` ms so a fast response never flashes it.
 *
 * @example
 * import { Loading } from "@chelone/react";
 *
 * const Slow = () => <Loading />;
 */
function Loading(props: LoadingProps) {
  const {
    loadingPrimary = "chelone.page.loading",
    loadingSecondary = "chelone.message.loading_detail",
    delay = 1000,
    ...rest
  } = props;
  const translate = useTranslate();
  const oneSecondHasPassed = useTimeout(delay);
  return oneSecondHasPassed ? (
    <div
      className="flex flex-col justify-center items-center h-full"
      role="status"
      aria-live="polite"
      {...rest}
    >
      <div className="text-center font-sans text-muted-foreground py-1">
        <div className="flex justify-center">
          <Spinner size="large" className="size-9" />
        </div>
        <h5 className="mt-3 text-2xl text-secondary-foreground">
          {translate(loadingPrimary, { _: loadingPrimary })}
        </h5>
        <p className="text-primary">
          {translate(loadingSecondary, { _: loadingSecondary })}
        </p>
      </div>
    </div>
  ) : null;
}

interface LoadingProps {
  loadingPrimary?: string;
  loadingSecondary?: string;
  delay?: number;
}

type LoadingPageProps = LoadingProps;

export {
  Loading,
  Loading as LoadingPage,
  type LoadingPageProps,
  type LoadingProps,
};
