/**
 * `<SortButton>` — a dropdown to change the list sort. Ported from shadmin
 * `buttons/sort-button.tsx` and rebridged onto chelone's list-sort slice:
 * chelone models `sort` as a first-class `SortPayload[]` (multi-sort), so this
 * reads the PRIMARY column via `sort[0]` (falling back to the resource default)
 * and calls the controller `setSort({ field, order })`. The controller itself
 * toggles ASC/DESC when the same single field is re-selected, so this only has
 * to compute the NEXT order for the menu-item label. Other seams (`useTranslate`
 * / `useTranslateLabel` / `useResourceContext` / `shallowEqual` / `useIsMobile`)
 * are mechanical import repoints.
 */

import type { SourceProp } from "@chelone/core";
import { definedParams } from "@chelone/core";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import * as React from "react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslate } from "../../../i18n-hooks";
import { useTranslateLabel } from "../../../label";
import { useListSortContext } from "../../../list/list-slice-hooks";
import { useResourceContext } from "../../../resource";
import { shallowEqual } from "../../../util/shallow-equal";

type ButtonProps = React.ComponentProps<typeof Button>;

const defaultIcon = <ArrowUpDown />;

const inverseOrder = (order: string): "ASC" | "DESC" =>
  order === "ASC" ? "DESC" : "ASC";

const DEFAULT_SORT = { field: "id", order: "DESC" as const };

interface SortButtonProps extends ButtonProps {
  fields: SourceProp[];
  icon?: React.ReactNode;
  label?: string;
  resource?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * A button that opens a dropdown menu to change list sorting.
 *
 * Displays the current sort field + order, and toggles between ASC and DESC
 * when re-selecting the same field.
 *
 * @example
 * import { SortButton } from "@chelone/react";
 *
 * const PostListActions = () => <SortButton fields={["title", "published_at"]} />;
 */
function SortButtonComponent(props: SortButtonProps) {
  const {
    fields,
    label = "chelone.sort.sort_by",
    icon = defaultIcon,
    resource: _resource,
    ref,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  const { sort, setSort } = useListSortContext();
  const primarySort = sort[0] ?? DEFAULT_SORT;
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const handleChangeSort = (field: string) => {
    setSort({
      field,
      order:
        field === primarySort.field ? inverseOrder(primarySort.order) : "ASC",
    });
    setOpen(false);
  };

  const fieldLabel = translateLabel({
    resource,
    source: primarySort.field,
  });
  const translationOptions = definedParams({
    field: typeof fieldLabel === "string" ? fieldLabel : undefined,
    field_lower_first:
      typeof fieldLabel === "string"
        ? fieldLabel.charAt(0).toLowerCase() + fieldLabel.slice(1)
        : undefined,
    order: translate(`chelone.sort.${primarySort.order}`, {
      _: primarySort.order,
    }),
  });
  const buttonLabel = translate(`resources.${resource}.action.sort_by`, {
    ...translationOptions,
    _: translate(label, { ...translationOptions, _: label }),
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {isMobile ? (
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={buttonLabel}
                ref={ref}
                {...rest}
              >
                {icon}
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>
            <p>{buttonLabel}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            aria-label={buttonLabel}
            ref={ref}
            {...rest}
          >
            {icon}
            <span>{buttonLabel}</span>
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="start">
        {fields.map((field) => (
          <DropdownMenuItem key={field} onClick={() => handleChangeSort(field)}>
            {translateLabel({
              resource,
              source: field,
            })}{" "}
            {translate(
              `chelone.sort.${
                primarySort.field === field
                  ? inverseOrder(primarySort.order)
                  : "ASC"
              }`,
              {
                _:
                  primarySort.field === field
                    ? inverseOrder(primarySort.order)
                    : "ASC",
              },
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const arePropsEqual = (
  prevProps: SortButtonProps,
  nextProps: SortButtonProps,
) => shallowEqual(prevProps.fields, nextProps.fields);

const SortButton = memo(SortButtonComponent, arePropsEqual);

export { SortButton, type SortButtonProps };
