import type { SourceProp } from "@chelone/core";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { TextInput, type TextInputProps } from "./text-input";

interface PasswordInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends Omit<TextInputProps<TRecord, TPath>, "type" | "multiline"> {
  initiallyVisible?: boolean;
}

/**
 * Text input for passwords, with a button to toggle visibility.
 *
 * Wraps `<TextInput>` and forces `type="password"`; the toggle goes in its
 * `controlSuffix`, so it is centred on the input with or without a label. Set
 * `initiallyVisible` to render the password in plain text on first render.
 *
 * @example
 * import { Edit, PasswordInput } from '@/components/admin';
 *
 * const UserEdit = () => (
 *   <Edit>
 *     <PasswordInput source="password" />
 *   </Edit>
 * );
 */
function PasswordInput<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
>(props: PasswordInputProps<TRecord, TPath>) {
  const {
    initiallyVisible = false,
    className,
    inputClassName,
    ...rest
  } = props;
  const [visible, setVisible] = useState(initiallyVisible);
  const translate = useTranslate();

  return (
    <TextInput<TRecord, TPath>
      {...rest}
      type={visible ? "text" : "password"}
      className={className}
      inputClassName={cn("pr-10", inputClassName)}
      controlSuffix={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground"
          onClick={() => setVisible((v) => !v)}
          aria-label={translate(
            visible
              ? "chelone.input.password.toggle_visible"
              : "chelone.input.password.toggle_hidden",
            { _: visible ? "Hide password" : "Show password" },
          )}
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      }
    />
  );
}

export { PasswordInput, type PasswordInputProps };
