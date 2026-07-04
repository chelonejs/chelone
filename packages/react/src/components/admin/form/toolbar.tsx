/**
 * `<Toolbar>` — the default action bar at the bottom of Edit/Create forms.
 * Ported verbatim from shadmin `form/toolbar.tsx` (no shadmin-core seam — it
 * only composes `<SaveButton>` + `<DeleteButton>`, both already rebridged).
 *
 * With no children it renders `<SaveButton>` on the left and `<DeleteButton>`
 * on the right (the standard edit-form layout). Pass children to replace them.
 */

import type { ReactNode } from "react";
import { Children } from "react";
import { cn } from "@/lib/utils";
import { DeleteButton } from "../buttons/delete-button";
import { SaveButton } from "../buttons/save-button";

/**
 * The default toolbar rendered at the bottom of Edit and Create forms.
 *
 * @example // Custom toolbar with only a SaveButton
 * import { Edit, Toolbar, SaveButton } from "@chelone/react";
 *
 * const MyToolbar = () => (
 *   <Toolbar>
 *     <SaveButton />
 *   </Toolbar>
 * );
 *
 * const PostEdit = () => (
 *   <Edit>
 *     ...
 *     <MyToolbar />
 *   </Edit>
 * );
 */
function Toolbar({ children, className, resource, ...rest }: ToolbarProps) {
  return (
    <div
      {...rest}
      role="toolbar"
      className={cn(
        "sticky pt-4 pb-4 md:block md:pt-2 md:pb-0 bottom-0 bg-linear-to-b from-transparent to-background to-10%",
        className,
      )}
    >
      {Children.count(children) === 0 ? (
        <div className="flex flex-row gap-2 justify-between">
          <SaveButton />
          <DeleteButton resource={resource} variant="ghost" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  /** Forward to the default `<DeleteButton>` when used outside a ResourceContext. */
  resource?: string;
}

export { Toolbar, type ToolbarProps };
