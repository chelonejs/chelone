import type { ReactNode } from "react";
import { useTranslateLabel } from "../../../label";

interface FieldLabelTextProps {
  source?: string;
  resource?: string;
  /** A string is translated; a ReactNode renders as-is; `false`/`""` renders nothing. */
  label?: ReactNode;
  isRequired?: boolean;
}

/**
 * Renders a field/input's resolved, translated label text (+ required marker).
 * shadcn-native replacement for ra-core's `<FieldTitle>`: keeps the headless
 * `useTranslateLabel` logic, drops the RA component. Composes inside a shadcn
 * `<FieldLabel>` for inputs, or standalone for table headers / record fields.
 */
export function FieldLabelText({
  source,
  resource,
  label,
  isRequired,
}: FieldLabelTextProps) {
  const translateLabel = useTranslateLabel();
  if (label === false || label === "") return null;
  if (label != null && typeof label !== "string") return <>{label}</>;
  return (
    <span>
      {translateLabel({ label, source, resource })}
      {isRequired && <span aria-hidden="true">&thinsp;*</span>}
    </span>
  );
}
