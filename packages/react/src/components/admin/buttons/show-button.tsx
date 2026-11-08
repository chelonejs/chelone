/**
 * `<ShowButton>` — navigates to a record's show page. Ported from shadmin
 * `buttons/show-button.tsx` and rebridged onto the router-adapter `Link`
 * (`useRouterAdapter`), the no-throw `useMenuAccess`, and `@chelone/react`'s
 * `useCreatePath`/`useGetResourceLabel`/`useGetRecordRepresentation`/
 * `useResourceTranslation`. Reads the record from `RecordContext`.
 */

import type { LooseRecord, ResourceRecord } from "@chelone/core";
import { definedParams } from "@chelone/core";
import { Eye } from "lucide-react";
import type { Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  useGetRecordRepresentation,
  useGetResourceLabel,
  useResourceTranslation,
} from "../../../label";
import { useRecordContext } from "../../../record/record-context";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "../layout/use-menu-access";

type ShowButtonProps<TRecord extends ResourceRecord = LooseRecord> = {
  label?: string;
  icon?: React.ReactNode;
  record?: TRecord;
  resource?: string;
  scrollToTop?: boolean;
  ref?: Ref<HTMLAnchorElement>;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

// useful to prevent click bubbling in a datagrid with rowClick
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

/**
 * A button that navigates to the show page for a record.
 *
 * Works within a `RecordContext` to get the record id.
 *
 * @example
 * import { ShowButton } from "@chelone/react";
 *
 * const PostActions = () => <ShowButton label="View Details" />;
 */
function ShowButton<TRecord extends ResourceRecord = LooseRecord>(
  props: ShowButtonProps<TRecord>,
) {
  const {
    label: labelProp,
    icon,
    record: _record,
    resource: _resource,
    scrollToTop = true,
    ref,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const record = useRecordContext<TRecord>(props);
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();
  const { canAccess, isPending: isAccessPending } = useMenuAccess({
    action: "show",
    resource: resource ?? "",
    record,
  });
  const getResourceLabel = useGetResourceLabel();
  const getRecordRepresentation = useGetRecordRepresentation(resource);
  const recordRepresentationValue = getRecordRepresentation(record);
  const recordRepresentation =
    typeof recordRepresentationValue === "string"
      ? recordRepresentationValue
      : recordRepresentationValue?.toString();
  const label = useResourceTranslation({
    resourceI18nKey: resource ? `resources.${resource}.action.show` : undefined,
    baseI18nKey: "chelone.action.show",
    options: definedParams({
      _: "Show",
      name: resource ? getResourceLabel(resource, 1) : undefined,
      recordRepresentation,
    }),
    userText: labelProp,
  });
  if (!record || record.id == null || !canAccess || isAccessPending) {
    return null;
  }
  const link = createPath({ resource, type: "show", id: record.id });
  return (
    <Link
      ref={ref}
      className={buttonVariants({ variant: "outline" })}
      to={link}
      state={{ _scrollToTop: scrollToTop }}
      onClick={stopPropagation}
      aria-label={typeof label === "string" ? label : undefined}
      {...rest}
    >
      {icon ?? <Eye />}
      {label}
    </Link>
  );
}

export { ShowButton, type ShowButtonProps };
