/**
 * `<FilterButton>` — an "Add filter" dropdown that toggles which optional
 * filters are displayed in the `<FilterForm>`. Ported from shadmin
 * `buttons/filter-button.tsx` and rebridged onto chelone's list-filter slice:
 *
 * - filter ELEMENTS come from `useFilterContext()` (the ambient `<Filter>`
 *   inputs) or the `filters` prop; the displayed/toggle state comes from
 *   `useListContext` (`displayedFilters` / `showFilter` / `hideFilter` /
 *   `filterValues` / `setFilters`).
 * - the SAVED-QUERIES feature is DROPPED — chelone has no `useSavedQueries` /
 *   saved-query dialogs stack yet. This leaves the two behaviors the button is
 *   really about: toggling optional filters on/off, and a "remove all filters"
 *   action when a filter is active. `disableSaveQuery` is accepted for API
 *   parity but is now a no-op (there is nothing to save).
 */

import { Filter, X } from "lucide-react";
import type { HtmlHTMLAttributes, ReactNode } from "react";
import {
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFilterContext } from "../../../list/filter-context";
import { useListFilterContext } from "../../../list/list-slice-hooks";
import { useResourceContext } from "../../../resource";
import { FieldLabelText } from "../common/field-label-text";

interface FilterElementProps {
  source: string;
  alwaysOn?: boolean;
  defaultValue?: unknown;
  label?: React.ReactNode;
  disabled?: boolean;
}

interface FilterButtonProps extends HtmlHTMLAttributes<HTMLDivElement> {
  className?: string;
  /** Accepted for API parity; a no-op (chelone has no saved-queries stack yet). */
  disableSaveQuery?: boolean;
  filters?: ReactNode[];
  resource?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

interface FilterButtonMenuItemProps {
  filter: React.ReactElement<FilterElementProps>;
  displayed: boolean;
  onShow: (params: { source: string; defaultValue: unknown }) => void;
  onHide: (params: { source: string }) => void;
  resource?: string;
  autoFocus?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * The `<FilterForm>` input for `source`, if the page has one. Matched on `name`
 * rather than through an `input[name='...']` selector: a source is a path an
 * app names, and a quote in one makes such a selector invalid.
 */
function findFilterInput(source: string): HTMLInputElement | null {
  for (const input of document.querySelectorAll<HTMLInputElement>("input")) {
    if (input.name === source) return input;
  }
  return null;
}

/**
 * A button that opens a dropdown to add/remove the optional filters displayed
 * in the `<FilterForm>`. Works alongside `<FilterForm>` to provide the full
 * filtering UI.
 *
 * @example
 * import { FilterButton } from "@chelone/react";
 *
 * const PostFilters = [<TextInput key="q" source="q" alwaysOn />];
 * const PostListActions = () => <FilterButton filters={PostFilters} />;
 */
function FilterButton(props: FilterButtonProps) {
  const {
    filters: filtersProp,
    className,
    disableSaveQuery: _disableSaveQuery,
    size,
    variant = "outline",
    resource: _resource,
    ...rest
  } = props;
  const filters = useFilterContext() || filtersProp;
  const resource = useResourceContext(props);
  const translate = useTranslate();
  const { displayedFilters, filterValues, setFilters, showFilter, hideFilter } =
    useListFilterContext();
  const hasFilterValues = Object.keys(filterValues).length > 0;
  const [open, setOpen] = useState(false);
  /** The filter `handleShow` just displayed, whose input takes focus on close. */
  const shownSource = useRef<string | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  if (filters === undefined) {
    throw new Error(
      "The <FilterButton> component requires the <List filters> prop to be set",
    );
  }

  const allTogglableFilters = filters.filter(
    (filterElement) =>
      isValidElement<FilterElementProps>(filterElement) &&
      !filterElement.props.alwaysOn,
  );

  const handleShow = useCallback(
    ({ source, defaultValue }: { source: string; defaultValue: unknown }) => {
      showFilter(source, defaultValue === "" ? undefined : defaultValue);
      // The FilterFormInput has no way of knowing it was just displayed (and so
      // that it should focus its input), so fall back to imperative focus.
      // Closing the menu is what mounts it, so the focus belongs in the menu's
      // close auto-focus (see handleCloseAutoFocus), not on a timer racing it.
      shownSource.current = source;
      setOpen(false);
    },
    [showFilter],
  );

  /**
   * Radix returns focus to the trigger when the menu closes. When the close is
   * a "show this filter", take focus to the filter's input instead: the input
   * is mounted by the same commit that closes the menu.
   */
  const handleCloseAutoFocus = useCallback((event: Event) => {
    const source = shownSource.current;
    shownSource.current = undefined;
    if (source === undefined) return;
    // The menu can close as part of the button's own unmount. A button that is
    // off the document takes no focus anywhere.
    if (!rootRef.current?.isConnected) return;
    const input = findFilterInput(source);
    // A filter whose control is no `<input>` (a `<Select>` trigger, a
    // `<Switch>`) has nothing here to focus, so Radix keeps the focus on the
    // trigger.
    if (input === null) return;
    event.preventDefault();
    input.focus();
  }, []);

  const handleRemove = useCallback(
    ({ source }: { source: string }) => {
      hideFilter(source);
      setOpen(false);
    },
    [hideFilter],
  );

  if (allTogglableFilters.length === 0 && !hasFilterValues) {
    return null;
  }

  return (
    <div ref={rootRef} className={cn("inline-block", className)} {...rest}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            className="add-filter"
            variant={variant}
            size={size}
            aria-haspopup="true"
          >
            <Filter />
            {translate("chelone.action.add_filter", { _: "Add filter" })}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {allTogglableFilters
            .filter(
              (
                filterElement,
              ): filterElement is React.ReactElement<FilterElementProps> =>
                isValidElement<FilterElementProps>(filterElement),
            )
            .map((filterElement, index: number) => (
              <FilterButtonMenuItem
                key={filterElement.props.source}
                filter={filterElement}
                displayed={!!displayedFilters[filterElement.props.source]}
                resource={resource}
                onShow={handleShow}
                onHide={handleRemove}
                autoFocus={index === 0}
              />
            ))}
          {hasFilterValues && allTogglableFilters.length > 0 && (
            <DropdownMenuSeparator />
          )}
          {hasFilterValues && (
            <DropdownMenuItem
              onClick={() => {
                setFilters({}, {});
                setOpen(false);
              }}
            >
              <X className="size-4 mr-2" />
              {translate("chelone.action.remove_all_filters", {
                _: "Remove all filters",
              })}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * A menu item inside the `<FilterButton>` dropdown for toggling an optional
 * filter's visibility in the `<FilterForm>`.
 */
function FilterButtonMenuItem(props: FilterButtonMenuItemProps) {
  const { filter, onShow, onHide, displayed, autoFocus, ref } = props;
  const resource = useResourceContext(props);
  const localRef = useRef<HTMLDivElement | null>(null);
  const handleShow = useCallback(() => {
    onShow({
      source: filter.props.source,
      defaultValue: filter.props.defaultValue,
    });
  }, [filter.props.defaultValue, filter.props.source, onShow]);
  const handleHide = useCallback(() => {
    onHide({ source: filter.props.source });
  }, [filter.props.source, onHide]);
  useEffect(() => {
    if (autoFocus) {
      localRef.current?.focus();
    }
  }, [autoFocus]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  return (
    <DropdownMenuCheckboxItem
      className="new-filter-item"
      checked={displayed}
      onCheckedChange={(next) => (next ? handleShow() : handleHide())}
      onSelect={(e) => e.preventDefault()}
      disabled={filter.props.disabled}
      data-key={filter.props.source}
      ref={setRefs}
    >
      <FieldLabelText
        label={filter.props.label}
        source={filter.props.source}
        resource={resource}
      />
    </DropdownMenuCheckboxItem>
  );
}

export {
  FilterButton,
  FilterButtonMenuItem,
  type FilterButtonMenuItemProps,
  type FilterButtonProps,
};
