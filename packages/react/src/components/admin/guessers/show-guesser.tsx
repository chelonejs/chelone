import { type ComponentType, useEffect, useRef } from "react";
import { useResourceContext } from "../../../resource";
import { RecordField } from "../fields/record-field";
import { Show, type ShowProps } from "../views/show";
import { guessFieldComponents } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import { GuesserEmpty } from "./guesser-empty";
import { useGuessedResource } from "./use-guessed-resource";

// The package has no `@types/node`, so a minimal ambient declaration keeps the
// reference typed — same idiom as `feedback/error.tsx`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

interface ShowGuesserProps extends Omit<ShowProps, "children"> {
  /** Log the equivalent hand-written show page once per resource. Defaults to on outside production. */
  enableLog?: boolean;
}

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/**
 * A show page whose fields come from the resource's registered Zod schema, so
 * they exist before the record loads. A resource without a schema shows
 * `<GuesserEmpty>` and fetches no record.
 *
 * @example
 * import { Resource, ShowGuesser } from "@chelone/react";
 *
 * <Resource name="posts" show={ShowGuesser} />;
 */
function ShowGuesser({
  enableLog = IS_DEV,
  resource: resourceProp,
  ...rest
}: ShowGuesserProps) {
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The ShowGuesser component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const described = useGuessedResource(resource);
  const logged = useRef<string | null>(null);

  useEffect(() => {
    if (!enableLog || !described || logged.current === resource) return;
    logged.current = resource;
    console.log(printGuessedView("Show", resource, described.fields));
  }, [enableLog, described, resource]);

  if (!described) return <GuesserEmpty resource={resource} />;

  return (
    <Show {...rest} resource={resource}>
      {described.fields
        .filter((field) => field.kind !== "unsupported")
        .map((field) => {
          const label = field.label;
          if (field.kind === "text" || !field.field) {
            return (
              <RecordField
                key={field.source}
                source={field.source}
                {...(label !== undefined && { label })}
              />
            );
          }
          const Field = guessFieldComponents[field.field] as ComponentType<
            Record<string, unknown>
          >;
          return (
            <RecordField
              key={field.source}
              source={field.source}
              {...(label !== undefined && { label })}
            >
              <Field
                source={field.source}
                {...(field.reference !== undefined && {
                  reference: field.reference,
                })}
                {...(field.choices && { choices: field.choices })}
                {...field.fieldProps}
              />
            </RecordField>
          );
        })}
    </Show>
  );
}

export { ShowGuesser, type ShowGuesserProps };
