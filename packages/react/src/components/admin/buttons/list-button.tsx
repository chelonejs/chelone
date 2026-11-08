/**
 * `<ListButton>` — navigates to a resource's list page. Ported from shadmin
 * `buttons/list-button.tsx` and rebridged onto the router-adapter `Link`
 * (`useRouterAdapter`), the no-throw `useMenuAccess` (chelone's `useCanAccess`
 * throws with no authProvider), and `@chelone/react`'s `useCreatePath` /
 * `useGetResourceLabel` / `useResourceTranslation`. Commonly used in the actions
 * of an `<Edit>` / `<Show>` view to navigate back to the list.
 */

import { List as ListIcon } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "../layout/use-menu-access";

interface ListButtonProps {
  resource?: string;
  label?: string;
  icon?: ReactNode;
  className?: string;
  scrollToTop?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

const defaultIcon = <ListIcon />;
const scrollState = { _scrollToTop: true };

/**
 * Opens the List view of a given resource.
 *
 * Reads the resource from `ResourceContext` by default.
 *
 * @example
 * import { Edit, ListButton } from "@chelone/react";
 *
 * const PostEdit = () => (
 *   <Edit actions={<ListButton />}>
 *     ...
 *   </Edit>
 * );
 */
function ListButton(props: ListButtonProps) {
  const {
    label: labelProp,
    icon = defaultIcon,
    className,
    scrollToTop = true,
    ref,
  } = props;
  const resource = useResourceContext(props);
  if (!resource) {
    throw new Error(
      "<ListButton> components should be used inside a <Resource> component or provided the resource prop.",
    );
  }
  const { canAccess, isPending } = useMenuAccess({
    action: "list",
    resource,
  });
  const createPath = useCreatePath();
  const { Link } = useRouterAdapter();
  const getResourceLabel = useGetResourceLabel();
  const label = useResourceTranslation({
    resourceI18nKey: `resources.${resource}.action.list`,
    baseI18nKey: "chelone.action.list",
    options: {
      _: "List",
      name: getResourceLabel(resource, 1),
    },
    userText: labelProp,
  });

  if (!canAccess || isPending) {
    return null;
  }

  return (
    <Link
      ref={ref}
      className={cn(buttonVariants({ variant: "outline" }), className)}
      to={createPath({ type: "list", resource })}
      state={scrollToTop ? scrollState : undefined}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}

export { ListButton, type ListButtonProps };
