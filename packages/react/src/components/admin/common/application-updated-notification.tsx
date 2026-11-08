/**
 * `<ApplicationUpdatedNotification>` — a card telling the user a new version
 * of the app is available, with a reload button. Ported from shadmin
 * `common/application-updated-notification.tsx`; `<Translate>` is rewired to
 * `translate(key, { _: english })`; custom labels fall back to themselves.
 */

import { Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";

/**
 * Pinned at the bottom centre of the viewport. The button calls `onReload`, or
 * reloads the page when there is none. Not mounted by `<Layout>`: render it
 * when the app detects a new build.
 *
 * @example
 * import { ApplicationUpdatedNotification } from "@chelone/react";
 *
 * const Update = () => <ApplicationUpdatedNotification />;
 */
function ApplicationUpdatedNotification({
  message,
  notificationText,
  buttonLabel,
  updateText,
  onReload,
  className,
  ...rest
}: ApplicationUpdatedNotificationProps) {
  const translate = useTranslate();
  const messageText = message ?? notificationText;
  const buttonText = buttonLabel ?? updateText;
  return (
    <Card
      role="alert"
      className={cn(
        "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex-row items-center gap-3 px-4 py-3",
        className,
      )}
      {...rest}
    >
      <Sparkles className="size-4 shrink-0" />
      <span className="text-sm">
        {messageText
          ? translate(messageText, { _: messageText })
          : translate("chelone.notification.application_update_available", {
              _: "A new version of the application is available",
            })}
      </span>
      <Button size="sm" onClick={onReload ?? (() => window.location.reload())}>
        {buttonText
          ? translate(buttonText, { _: buttonText })
          : translate("chelone.action.reload", { _: "Reload" })}
      </Button>
    </Card>
  );
}

interface ApplicationUpdatedNotificationProps
  extends Omit<ComponentProps<"div">, "children"> {
  message?: string;
  buttonLabel?: string;
  onReload?: () => void;
  /** Alias for `message`. */
  notificationText?: string;
  /** Alias for `buttonLabel`. */
  updateText?: string;
}

export {
  ApplicationUpdatedNotification,
  type ApplicationUpdatedNotificationProps,
};
