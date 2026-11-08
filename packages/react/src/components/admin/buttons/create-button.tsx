/**
 * `<CreateButton>` — navigates to a resource's create page. Ported from shadmin
 * `buttons/create-button.tsx` and rebridged:
 * - react-router's `<Link>` → the router-adapter `Link` (`useRouterAdapter`),
 *   the framework-swappable nav seam.
 * - shadmin-core's `useCanAccess` (which throws with no authProvider in chelone)
 *   → `useMenuAccess`, the no-throw access check (allow when auth unconfigured).
 * - `useCreatePath`/`useGetResourceLabel`/`useResourceTranslation` come straight
 *   from `@chelone/react`.
 */

import { definedParams } from "@chelone/core";
import { Plus } from "lucide-react";
import type { Ref } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { useResourceContext } from "../../../resource";
import { useCreatePath } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "../layout/use-menu-access";

interface CreateButtonProps {
  label?: string;
  icon?: React.ReactNode;
  resource?: string;
  scrollToTop?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

const defaultIcon = <Plus />;

// useful to prevent click bubbling in a datagrid with rowClick
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

/**
 * A button that navigates to the create page for a resource.
 *
 * Uses the current `<Resource>` unless overridden with `resource`.
 *
 * @example
 * import { List, CreateButton } from "@chelone/react";
 *
 * const PostList = () => (
 *   <List actions={<CreateButton />}>
 *     ...
 *   </List>
 * );
 */
function CreateButton(props: CreateButtonProps) {
  const {
    label: labelProp,
    icon = defaultIcon,
    scrollToTop = true,
    ref,
  } = props;
  const resource = useResourceContext(props);
  const { canAccess, isPending } = useMenuAccess({
    action: "create",
    resource: resource ?? "",
  });
  const createPath = useCreatePath();
  const getResourceLabel = useGetResourceLabel();
  const { Link } = useRouterAdapter();
  const link = createPath({ resource, type: "create" });
  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.create`
      : undefined,
    baseI18nKey: "chelone.action.create",
    options: definedParams({
      _: "Create",
      name: resource ? getResourceLabel(resource, 1) : undefined,
    }),
    userText: labelProp,
  });
  if (isPending || !canAccess) return null;
  return (
    <Link
      ref={ref}
      className={buttonVariants({ variant: "outline" })}
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

export { CreateButton, type CreateButtonProps };
