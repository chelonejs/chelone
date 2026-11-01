/**
 * `<GuesserEmpty>` — the notice a guesser shows for a resource with no
 * registered schema. Carried from shadmin `guesser-empty.tsx`.
 *
 * Chelone divergences:
 * - The default text names `defineResources`, since a guesser reads the
 *   registered schema and never falls back to fetched records.
 * - The keys are `chelone.guesser.no_schema.*` with the English text as the
 *   `_` fallback.
 */

import { FileQuestion } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";

interface GuesserEmptyProps {
  /** Replaces the default title. A string is translated, with itself as the fallback. */
  title?: ReactNode;
  /** Replaces the default message. A string is translated, with itself as the fallback. */
  message?: ReactNode;
  /** The resource named in the default message. Falls back to the resource context. */
  resource?: string;
}

/**
 * A centered notice that a resource has no schema to generate a page from.
 *
 * @example
 * import { GuesserEmpty } from "@chelone/react";
 *
 * const PostsList = () => <GuesserEmpty resource="posts" />;
 */
function GuesserEmpty({ title, message, resource }: GuesserEmptyProps) {
  const translate = useTranslate();
  const name = useResourceContext({ resource }) ?? "";

  const renderedTitle =
    title === undefined
      ? translate("chelone.guesser.no_schema.title", {
          _: "No schema registered",
        })
      : typeof title === "string"
        ? translate(title, { _: title })
        : title;
  const renderedMessage =
    message === undefined
      ? translate("chelone.guesser.no_schema.message", {
          _: "Register a Zod schema for {resource} with defineResources so this page can be generated.",
          resource: name,
        })
      : typeof message === "string"
        ? translate(message, { _: message, resource: name })
        : message;

  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <FileQuestion className="size-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{renderedTitle}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {renderedMessage}
      </p>
    </div>
  );
}

export { GuesserEmpty, type GuesserEmptyProps };
