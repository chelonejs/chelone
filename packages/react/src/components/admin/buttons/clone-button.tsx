/**
 * `<CloneButton>` — opens the create page pre-filled with a copy of a record.
 * Ported from shadmin `buttons/clone-button.tsx` and rebridged like
 * `<EditButton>`. The record travels in `?source=` as JSON; `<Create>` reads
 * it back with `getRecordFromLocation`.
 */

import type { LooseRecord } from "@chelone/core";
import { definedParams } from "@chelone/core";
import { Copy } from "lucide-react";
import type { Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "../layout/use-menu-access";

interface CloneButtonProps {
  record?: LooseRecord;
  resource?: string;
  label?: string;
  icon?: React.ReactNode;
  scrollToTop?: boolean;
  className?: string;
  ref?: Ref<HTMLAnchorElement>;
}

const defaultIcon = <Copy />;

// useful to prevent click bubbling in a datagrid with rowClick
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

/**
 * A button that opens the create page pre-filled with a copy of the record
 * (without its `id`).
 *
 * Works within a `RecordContext` to get the record.
 *
 * @example
 * import { Edit, CloneButton, TextInput } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit actions={<CloneButton />}>
 *     <TextInput source="title" />
 *   </Edit>
 * );
 */
function CloneButton(props: CloneButtonProps) {
  const {
    label: labelProp,
    icon = defaultIcon,
    scrollToTop = true,
    className,
    ref,
  } = props;
  const resource = useResourceContext(props);
  const record = useRecordContext(props);
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "create",
    resource: resource ?? "",
  });
  const getResourceLabel = useGetResourceLabel();
  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.clone`
      : undefined,
    baseI18nKey: "ra.action.clone",
    options: definedParams({
      _: "Clone",
      name: resource ? getResourceLabel(resource, 1) : undefined,
    }),
    userText: labelProp,
  });
  if (!record || record.id == null || !canAccess || isAccessPending) {
    return null;
  }
  const { id: _id, ...copy } = record;
  const link = `${createPath({ resource, type: "create" })}?source=${encodeURIComponent(JSON.stringify(copy))}`;
  return (
    <Link
      ref={ref}
      className={cn(buttonVariants({ variant: "outline" }), className)}
      to={link}
      state={{ _scrollToTop: scrollToTop }}
      onClick={stopPropagation}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}

export { CloneButton, type CloneButtonProps };
