import { useTranslate } from "../../../i18n-hooks";
import { useListFilterContext } from "../../../list/list-slice-hooks";
import { useResourceContext } from "../../../resource";
import { Button } from "../../ui/button";

export interface ListNoResultsProps {
  className?: string;
}

/**
 * The empty state of a list. Under an active filter it says so and offers to
 * clear it.
 */
function ListNoResults({ className }: ListNoResultsProps) {
  const translate = useTranslate();
  const resource = useResourceContext();
  const { filterValues, setFilters } = useListFilterContext();
  if (!resource) {
    throw new Error("<ListNoResults> must be used inside a <List> component");
  }

  // chelone's i18n echoes a missing key, so each message passes its fallback.
  const filtered = Object.keys(filterValues).length > 0;
  return (
    <div
      className={
        className ?? "flex flex-col items-center gap-2 p-6 text-center text-sm"
      }
    >
      <p className="text-muted-foreground">
        {filtered
          ? translate("chelone.navigation.no_filtered_results", {
              _: "No results found with the current filters.",
            })
          : translate("chelone.navigation.no_results", {
              _: "No results found",
            })}
      </p>
      {filtered ? (
        <Button variant="outline" size="sm" onClick={() => setFilters({}, {})}>
          {translate("chelone.navigation.clear_filters", {
            _: "Clear filters",
          })}
        </Button>
      ) : null}
    </div>
  );
}

export { ListNoResults };
