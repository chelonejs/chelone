import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The inline panel of the link and image forms: a URL box (Enter submits), an
 * Apply button, the form's own buttons as `children`, and `error` below.
 */
function RichTextUrlForm({
  slot,
  label,
  applyLabel,
  error,
  value,
  onChange,
  onSubmit,
  children,
}: {
  slot: string;
  label: string;
  applyLabel: string;
  /** Shown as an alert when set; typing in the box is the caller's cue to clear it. */
  error: string | null;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      data-slot={slot}
      className="flex flex-wrap items-center gap-2 border-t p-2"
    >
      <Input
        type="text"
        className="h-8 min-w-48 flex-1"
        aria-label={label}
        aria-invalid={error !== null || undefined}
        value={value}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        onChange={(event) => onChange(event.target.value)}
      />
      <Button type="button" size="sm" onClick={onSubmit}>
        {applyLabel}
      </Button>
      {children}
      {error !== null ? (
        <p role="alert" className="w-full text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { RichTextUrlForm };
