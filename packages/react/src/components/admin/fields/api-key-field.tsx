import type { LooseRecord } from "@chelone/core";
import { Copy, Eye, EyeOff } from "lucide-react";
import { type HTMLAttributes, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../../util/sanitize-field-rest-props";

interface ApiKeyFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType>,
    HTMLAttributes<HTMLSpanElement> {
  /** Record field with scope strings. Renders chips when set. */
  scopesSource?: string;
  /** Record field with ISO last-used timestamp. */
  lastUsedSource?: string;
  /** 'last4' shows the trailing 4 chars; 'full' masks everything. */
  maskedFormat?: "last4" | "full";
}

/**
 * Masked API-key display with reveal + copy buttons.
 *
 * Default masks all but the last 4 characters. Optional `scopesSource` renders
 * scope badges; optional `lastUsedSource` renders a relative timestamp.
 *
 * @example
 * <ApiKeyField source="apiKey" scopesSource="scopes" lastUsedSource="lastUsedAt" />
 */
function ApiKeyField<RecordType extends LooseRecord = LooseRecord>({
  defaultValue,
  source,
  record,
  scopesSource,
  lastUsedSource,
  maskedFormat = "last4",
  className,
  ...rest
}: ApiKeyFieldProps<RecordType>) {
  const value: unknown = useFieldValue({ defaultValue, source, record });
  const ctx = useRecordContext<RecordType>({ record });
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (value == null) return null;
  const key = String(value);

  const masked =
    maskedFormat === "last4"
      ? `${"•".repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`
      : "•".repeat(key.length);

  const scopes =
    scopesSource && ctx
      ? (ctx[scopesSource] as string[] | undefined)
      : undefined;
  const lastUsed =
    lastUsedSource && ctx
      ? (ctx[lastUsedSource] as string | null | undefined)
      : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard failures */
    }
  };

  return (
    <span
      {...sanitizeFieldRestProps(rest)}
      className={cn("inline-flex flex-col gap-1", className)}
    >
      <span className="inline-flex items-center gap-2">
        <span data-api-key className="font-mono text-sm">
          {revealed ? key : masked}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-api-key-reveal
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide API key" : "Reveal API key"}
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy API key"
        >
          <Copy className="h-4 w-4" />
        </Button>
        {copied && (
          <span className="text-xs text-muted-foreground">Copied!</span>
        )}
      </span>
      {scopes && scopes.length > 0 && (
        <span className="flex gap-1">
          {scopes.map((s) => (
            <span
              key={s}
              data-scope-badge
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
            >
              {s}
            </span>
          ))}
        </span>
      )}
      {lastUsedSource && (
        <span className="text-xs text-muted-foreground">
          Last used: {formatRelative(lastUsed)}
        </span>
      )}
    </span>
  );
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const delta = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const absSeconds = Math.abs(delta);
  if (absSeconds < 60) return rtf.format(Math.round(delta), "second");
  if (absSeconds < 3600) return rtf.format(Math.round(delta / 60), "minute");
  if (absSeconds < 86400) return rtf.format(Math.round(delta / 3600), "hour");
  if (absSeconds < 86400 * 30)
    return rtf.format(Math.round(delta / 86400), "day");
  return rtf.format(Math.round(delta / (86400 * 30)), "month");
}

export { ApiKeyField, type ApiKeyFieldProps };
