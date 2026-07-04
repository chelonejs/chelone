import type { ReactNode } from "react";
import { isValidElement } from "react";
import { FieldDescription } from "@/components/ui/field";
import { useTranslate } from "../../../i18n-hooks";

/**
 * Renders helper text below form inputs with automatic translation support.
 *
 * @internal
 */
interface InputHelperTextProps {
  helperText?: ReactNode | false;
}

function InputHelperText({ helperText }: InputHelperTextProps) {
  const translate = useTranslate();

  if (helperText === false) {
    return null;
  }

  if (helperText == null) {
    return null;
  }

  if (isValidElement(helperText)) {
    return helperText;
  }

  return (
    <FieldDescription>
      {typeof helperText === "string"
        ? translate(helperText, { _: helperText })
        : helperText}
    </FieldDescription>
  );
}

export { InputHelperText, type InputHelperTextProps };
