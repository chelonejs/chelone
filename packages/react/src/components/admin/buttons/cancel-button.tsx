/**
 * `<CancelButton>` — navigates back to the previous page. Ported from shadmin
 * `buttons/cancel-button.tsx`; the seams (shadmin-core's `<Translate>` +
 * react-router's `useNavigate`) are rewired to `@chelone/react`'s `useTranslate`
 * + the router-adapter `useNavigate` (whose `(delta)` overload supports the
 * `navigate(-1)` back-navigation). Commonly paired with `<SaveButton>` in a
 * form toolbar.
 */

import { CircleX } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "../../../i18n-hooks";
import { useNavigate } from "../../../router";

type CancelButtonProps = React.ComponentProps<"button"> & {
  ref?: Ref<HTMLButtonElement>;
};

/**
 * A button that navigates back to the previous page.
 *
 * @example
 * import { CancelButton, SaveButton } from "@chelone/react";
 *
 * const FormToolbar = () => (
 *   <div className="flex flex-row gap-2 justify-end">
 *     <CancelButton />
 *     <SaveButton />
 *   </div>
 * );
 */
function CancelButton({ ref, ...props }: CancelButtonProps) {
  const navigate = useNavigate();
  const translate = useTranslate();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => navigate(-1)}
      className="cursor-pointer"
      ref={ref}
      {...props}
    >
      <CircleX />
      {translate("chelone.action.cancel", { _: "Cancel" })}
    </Button>
  );
}

export { CancelButton, type CancelButtonProps };
