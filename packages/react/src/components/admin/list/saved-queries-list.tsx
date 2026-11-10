import {
  isSavedQueryActive,
  type SavedQueryValue,
  type TranslateParamValues,
} from "@chelone/core";
import { type FormEvent, useId, useState } from "react";
import { useListContext } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useResourceContext } from "../../../resource";
import { useSavedQueries } from "../../../saved-queries-hooks";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

export interface SavedQueriesListProps {
  /** Defaults to the ambient resource. */
  resource?: string;
  /** KV namespace for the saved queries. Default: the resource name. */
  storeKey?: string;
  className?: string;
}

/**
 * No record sits behind a saved query: it is stored under a resource and comes
 * back through `setParams`, which takes the open filter keys and the open sort
 * field the list context carries (`LooseListParamsPatch`). Naming no key is what
 * makes `SavedQueryValue` of it that open shape, so a stored sort reads as
 * `LooseSortPayload` end to end, as the provider verbs read it.
 */
type AnyQueryRecord = Record<string, never>;

/**
 * Named filter/sort sets of the ambient `<List>`: apply one with a click, save
 * the current one under a name, remove one. Place it among the list children.
 *
 * Chelone divergences from ra-core: no dialogs, the name is typed into an
 * inline form; only a list with a filter set can be saved, so a sort-only
 * query cannot.
 */
function SavedQueriesList({
  resource: resourceProp,
  storeKey,
  className,
}: SavedQueriesListProps) {
  const resource = useResourceContext({ resource: resourceProp });
  if (!resource) {
    throw new Error(
      "SavedQueriesList: no resource. Pass a `resource` prop or render inside a <Resource>.",
    );
  }
  const translate = useTranslate();
  const { filter, displayedFilters, sort, perPage, setParams } =
    useListContext();
  const { queries, save, remove } = useSavedQueries<AnyQueryRecord>(resource, {
    storeKey,
  });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const nameId = useId();

  // chelone's i18n returns the KEY when a message is not registered, so each
  // label carries a local English fallback (as `ListPagination` does).
  const t = (key: string, fallback: string, params?: TranslateParamValues) => {
    const out = translate(key, params ?? {});
    return out === key ? fallback : out;
  };

  const current: SavedQueryValue<AnyQueryRecord> = {
    filter,
    displayedFilters,
    sort,
    perPage,
  };
  const entries = queries.map((query) => ({
    ...query,
    active: isSavedQueryActive(query.value, current),
  }));
  const canSave =
    Object.keys(filter).length > 0 && !entries.some((entry) => entry.active);

  const closeForm = () => {
    setNaming(false);
    setName("");
  };
  // A form left open while the list stops being saveable would come back
  // pre-filled, and with autofocus, once it is saveable again.
  if (!canSave && (naming || name)) closeForm();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    // The list may have changed while the form was open.
    if (!canSave || !name.trim()) return;
    save(name, current);
    closeForm();
  };

  return (
    <div
      data-slot="saved-queries-list"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {entries.map(({ label, value, active }) => {
        return (
          <span key={label} className="inline-flex items-center">
            <Button
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() =>
                active
                  ? setParams({ filter: {} })
                  : setParams({
                      filter: value.filter,
                      displayedFilters: value.displayedFilters,
                      sort: value.sort,
                      perPage: value.perPage,
                    })
              }
            >
              {label}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t(
                "chelone.saved_queries.remove_label_with_name",
                `Remove saved query "${label}"`,
                { name: label },
              )}
              onClick={() => remove(label)}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </span>
        );
      })}
      {naming && canSave ? (
        <form className="flex items-center gap-2" onSubmit={submit}>
          <Input
            id={nameId}
            type="text"
            className="h-8 w-48"
            aria-label={t("chelone.saved_queries.query_name", "Query name")}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={!name.trim()}>
            {t("chelone.action.save", "Save")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
            {t("chelone.action.cancel", "Cancel")}
          </Button>
        </form>
      ) : canSave ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setNaming(true)}
        >
          {t("chelone.saved_queries.new_label", "Save current query")}
        </Button>
      ) : null}
    </div>
  );
}

export { SavedQueriesList };
