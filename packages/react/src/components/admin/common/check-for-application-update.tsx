/**
 * `<CheckForApplicationUpdate>` — shows a notice once a new build of the app
 * is deployed. Ported from shadmin `common/check-for-application-update.tsx`,
 * with ra-core's `useCheckForApplicationUpdate` rewired to the compat hook.
 */

import type { ApplicationUpdateStoreOptions } from "@chelone/core";
import type { ReactNode } from "react";
import { useCheckForApplicationUpdate } from "../../../compat-hooks";
import { ApplicationUpdatedNotification } from "./application-updated-notification";

/**
 * Renders nothing until the deployed page's body differs from the first one
 * fetched, then `notification`. Polls hourly by default and never polls outside
 * production unless `disabled={false}`. Not mounted by `<Layout>`: render it
 * where the app wants the notice.
 *
 * @example
 * import { CheckForApplicationUpdate } from "@chelone/react";
 *
 * const App = () => (
 *   <>
 *     <Admin dataProvider={dp} />
 *     <CheckForApplicationUpdate interval={600_000} />
 *   </>
 * );
 */
function CheckForApplicationUpdate({
  notification = <ApplicationUpdatedNotification />,
  ...options
}: CheckForApplicationUpdateProps) {
  const hasNewVersion = useCheckForApplicationUpdate(options);
  return hasNewVersion ? notification : null;
}

interface CheckForApplicationUpdateProps
  extends Omit<ApplicationUpdateStoreOptions, "disabled"> {
  /** Never fetch. Defaults to `true` outside production. */
  disabled?: boolean;
  /** Shown once a new build is found. Defaults to `<ApplicationUpdatedNotification />`. */
  notification?: ReactNode;
}

export { CheckForApplicationUpdate, type CheckForApplicationUpdateProps };
