import type { LooseRecord, ResourceMap } from "@chelone/core";
import { Fragment, useEffect, useRef } from "react";
import { useResourceContext } from "../../../resource";
import { Toolbar } from "../form/toolbar";
import { AutocompleteArrayInput } from "../inputs/autocomplete-array-input";
import { AutocompleteInput } from "../inputs/autocomplete-input";
import { ReferenceArrayInput } from "../inputs/reference-array-input";
import { ReferenceInput } from "../inputs/reference-input";
import { Edit, type EditProps } from "../views/edit";
import { guessInputElements } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import { GuesserEmpty } from "./guesser-empty";
import { useGuessedResource } from "./use-guessed-resource";

// The package has no `@types/node`, so a minimal ambient declaration keeps the
// reference typed — same idiom as `feedback/error.tsx`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

interface EditGuesserProps extends Omit<EditProps, "children"> {
  /** Log the equivalent hand-written edit page once per resource. Defaults to on outside production. */
  enableLog?: boolean;
}

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/**
 * An edit page whose inputs come from the resource's registered Zod schema, so
 * they exist before the record loads. `<Edit>` validates against the same
 * schema on save. A resource without a schema shows `<GuesserEmpty>` and
 * fetches no record.
 *
 * @example
 * import { Resource, EditGuesser } from "@chelone/react";
 *
 * <Resource name="posts" edit={EditGuesser} />;
 */
function EditGuesser({
  enableLog = IS_DEV,
  resource: resourceProp,
  ...rest
}: EditGuesserProps) {
  const contextResource = useResourceContext();
  const resource = resourceProp ?? contextResource;
  if (!resource) {
    throw new Error(
      "The EditGuesser component must be used within a ResourceContextProvider or given a `resource` prop",
    );
  }
  const described = useGuessedResource(resource);
  const logged = useRef<string | null>(null);

  useEffect(() => {
    if (!enableLog || !described || logged.current === resource) return;
    logged.current = resource;
    console.log(printGuessedView("Edit", resource, described.fields));
  }, [enableLog, described, resource]);

  if (!described) return <GuesserEmpty resource={resource} />;

  return (
    <Edit {...rest} resource={resource}>
      {described.fields.map((field) => {
        if (field.primary || field.kind === "unsupported" || !field.input) {
          return null;
        }
        const label = field.label;
        if (field.input === "ReferenceInput") {
          return (
            // The guessed name comes from the schema at runtime, so this call is
            // bound to an open map: `reference` stays a plain string.
            <ReferenceInput<LooseRecord, ResourceMap>
              key={field.source}
              source={field.source}
              reference={field.reference ?? ""}
            >
              <AutocompleteInput {...(label !== undefined && { label })} />
            </ReferenceInput>
          );
        }
        // The reference inputs take no `label`: it goes on the child input.
        if (field.input === "ReferenceArrayInput") {
          return (
            <ReferenceArrayInput<LooseRecord, ResourceMap>
              key={field.source}
              source={field.source}
              reference={field.reference ?? ""}
            >
              <AutocompleteArrayInput {...(label !== undefined && { label })} />
            </ReferenceArrayInput>
          );
        }
        return (
          <Fragment key={field.source}>
            {guessInputElements[field.input](field)}
          </Fragment>
        );
      })}
      <Toolbar />
    </Edit>
  );
}

export { EditGuesser, type EditGuesserProps };
