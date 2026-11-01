import { type ComponentType, useEffect, useRef } from "react";
import { useResourceContext } from "../../../resource";
import { DataTable } from "../list/data-table";
import { List, type ListProps } from "../views/list";
import { guessFieldComponents } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import { GuesserEmpty } from "./guesser-empty";
import { useGuessedResource } from "./use-guessed-resource";

// The package has no `@types/node`, so a minimal ambient declaration keeps the
// reference typed — same idiom as `feedback/error.tsx`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

interface ListGuesserProps extends Omit<ListProps, "children"> {
  /** Log the equivalent hand-written list once per resource. Defaults to on outside production. */
  enableLog?: boolean;
}

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/**
 * A list page whose columns come from the resource's registered Zod schema, so
 * they exist before any record loads. A resource without a schema shows
 * `<GuesserEmpty>` and makes no list request.
 *
 * @example
 * import { Resource, ListGuesser } from "@chelone/react";
 *
 * <Resource name="posts" list={ListGuesser} />;
 */
function ListGuesser({
  enableLog = IS_DEV,
  resource: resourceProp,
  ...rest
}: ListGuesserProps) {
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The ListGuesser component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const described = useGuessedResource(resource);
  const logged = useRef<string | null>(null);

  useEffect(() => {
    if (!enableLog || !described || logged.current === resource) return;
    logged.current = resource;
    console.log(printGuessedView("List", resource, described.fields));
  }, [enableLog, described, resource]);

  if (!described) return <GuesserEmpty resource={resource} />;

  return (
    <List {...rest} resource={resource}>
      <DataTable>
        {described.fields
          .filter((field) => field.kind !== "unsupported")
          .map((field) => {
            const label = field.label;
            if (field.kind === "text" || !field.field) {
              return (
                <DataTable.Col
                  key={field.source}
                  source={field.source}
                  label={label}
                />
              );
            }
            const Field = guessFieldComponents[field.field] as ComponentType<
              Record<string, unknown>
            >;
            return (
              <DataTable.Col
                key={field.source}
                source={field.source}
                label={label}
              >
                <Field
                  source={field.source}
                  {...(field.reference !== undefined && {
                    reference: field.reference,
                  })}
                  {...(field.choices && { choices: field.choices })}
                  {...field.fieldProps}
                />
              </DataTable.Col>
            );
          })}
      </DataTable>
    </List>
  );
}

export { ListGuesser, type ListGuesserProps };
