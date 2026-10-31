import { type ReactNode, useId } from "react";
import { Spinner } from "@/components/admin/feedback/spinner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTimeout } from "../../../compat-hooks";

interface LoadingInputProps {
  label?: ReactNode;
  helperText?: ReactNode;
  /** Milliseconds before the spinner replaces the empty placeholder. Defaults to 1000. */
  timeout?: number;
  size?: "default" | "sm";
  fullWidth?: boolean;
  className?: string;
}

/**
 * Holds an input's place while its data loads: a disabled, read-only input
 * with a label. A spinner appears inside the input's right edge once `timeout`
 * ms have passed, so a fast load never flashes it.
 */
function LoadingInput({
  label,
  helperText,
  timeout = 1000,
  size = "default",
  fullWidth,
  className,
}: LoadingInputProps) {
  const id = useId();
  const showSpinner = useTimeout(timeout);

  return (
    <fieldset
      data-slot="loading-input"
      className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}
    >
      {label ? (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <Input
          id={id}
          value=""
          disabled
          readOnly
          aria-busy="true"
          className={cn("pr-10", size === "sm" && "h-8")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex w-5 items-center justify-center">
          {showSpinner ? <Spinner size="small" className="size-5" /> : null}
        </span>
      </div>
      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </fieldset>
  );
}

export { LoadingInput, type LoadingInputProps };
