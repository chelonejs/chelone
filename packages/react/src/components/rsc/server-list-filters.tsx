"use client";

import {
  englishMessages,
  type GetListParams,
  type Identifier,
  type LooseFilterPayload,
  type LooseRecord,
  type RecordFilterKey,
  type ResourceRecord,
} from "@chelone/core";
import { type FormEvent, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "../../router/nav-hooks";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect, NativeSelectOption } from "../ui/native-select";
import { hrefOf, readUrlState } from "./server-list-href";

/** One filter input of a `<ServerListFilters>`. Plain data, so a server component passes it. */
interface ServerListFilter<RecordType extends ResourceRecord = LooseRecord> {
  /** The filter key: `q`, a source path, or a path with an operator suffix such as `title_like`. */
  source: RecordFilterKey<RecordType>;
  label: string;
  /** With choices the input is a select, and a choice's `id` is what the filter sends. */
  choices?: { id: Identifier; name: string }[];
}

interface ServerListFiltersProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  /** The list's pathname, as on the `<ServerList>` it filters. */
  path: string;
  /** The page's params: where the inputs get their values, and the sort and perPage a submit keeps. */
  params: GetListParams;
  filters: ServerListFilter<RecordType>[];
  /** A class name to apply to the form. */
  className?: string;
}

/** The text an input shows for the value `filter` holds at a flat filter key. */
function textAt(filter: GetListParams["filter"], key: string): string {
  const value = filter
    ? Object.entries(filter).find(([k]) => k === key)?.[1]
    : undefined;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

/**
 * The filter bar of a `<ServerList>`: a text input per filter, or a select when
 * it has `choices`. A submit navigates to `path` with the new filter on page 1,
 * keeping the sort and perPage, so the server renders the filtered page. It
 * needs client JavaScript: the URL holds the filter as JSON, which a plain GET
 * form cannot send.
 *
 * @example
 * <ServerListFilters
 *   path="/posts"
 *   params={page.params}
 *   filters={[
 *     { source: "title_like", label: "Title" },
 *     { source: "status", label: "Status", choices: [{ id: "draft", name: "Draft" }] },
 *   ]}
 * />
 */
function ServerListFilters<RecordType extends ResourceRecord = LooseRecord>({
  path,
  params,
  filters,
  className,
}: ServerListFiltersProps<RecordType>) {
  const navigate = useNavigate();
  const id = useId();
  const { perPage, state } = readUrlState(params);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const next: LooseFilterPayload = { ...params.filter };
      for (const { source, choices } of filters) {
        const raw = data.get(source);
        const text = typeof raw === "string" ? raw : "";
        const choice = choices?.find((c) => String(c.id) === text);
        if (text === "") delete next[source];
        else next[source] = choice ? choice.id : text;
      }
      navigate(hrefOf(path, { ...state, filter: next, perPage }, { page: 1 }));
    },
    [navigate, params.filter, filters, path, state, perPage],
  );

  return (
    <form
      // The inputs are uncontrolled, so a new URL remounts them with its values.
      key={JSON.stringify(params.filter ?? {})}
      onSubmit={onSubmit}
      className={cn("flex flex-wrap items-end gap-2", className)}
    >
      {filters.map(({ source, label, choices }) => {
        const defaultValue = textAt(params.filter, source);
        return (
          <div key={source} className="flex flex-col gap-1 text-sm">
            <label htmlFor={`${id}${source}`}>{label}</label>
            {choices ? (
              <NativeSelect
                id={`${id}${source}`}
                name={source}
                defaultValue={defaultValue}
              >
                <NativeSelectOption value="" />
                {choices.map((choice) => (
                  <NativeSelectOption key={choice.id} value={String(choice.id)}>
                    {choice.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={`${id}${source}`}
                name={source}
                defaultValue={defaultValue}
              />
            )}
          </div>
        );
      })}
      <Button type="submit">{englishMessages["chelone.action.search"]}</Button>
    </form>
  );
}

export {
  type ServerListFilter,
  ServerListFilters,
  type ServerListFiltersProps,
};
