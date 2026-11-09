import {
  booleanFieldDisplay,
  type LooseRecord,
  type ResourceRecord,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";
import { Check, type LucideIcon, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../../i18n-hooks";
import { useFieldValue } from "../../../record/use-field-value";

/**
 * Displays a boolean value as a colored check or close icon.
 *
 * @example
 * import { Show, SimpleShowLayout, BooleanField } from '@/components/admin';
 *
 * const PostShow = () => (
 *   <Show>
 *     <SimpleShowLayout>
 *       <BooleanField source="is_published" />
 *       <BooleanField source="allow_comments" />
 *     </SimpleShowLayout>
 *   </Show>
 * );
 */
function BooleanField<RecordType extends ResourceRecord = LooseRecord>({
  source,
  record,
  defaultValue,
  className,
  TrueIcon = Check,
  FalseIcon = X,
  valueLabelFalse,
  valueLabelTrue,
  looseValue = false,
  empty = null,
}: BooleanFieldProps<RecordType>) {
  const value = useFieldValue({ source, record, defaultValue });
  const display = booleanFieldDisplay(value, {
    looseValue,
    valueLabelFalse,
    valueLabelTrue,
  });

  if (display === null) {
    return <>{empty}</>;
  }

  const baseClassName = "size-5 text-foreground";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {display.truthy ? (
          TrueIcon ? (
            <TrueIcon className={cn(baseClassName, className)} />
          ) : (
            <div />
          )
        ) : FalseIcon ? (
          <FalseIcon className={cn(baseClassName, className)} />
        ) : (
          <div />
        )}
      </TooltipTrigger>
      <TooltipContent>
        <RenderLabel labelKey={display.labelKey} />
      </TooltipContent>
    </Tooltip>
  );
}

function RenderLabel({ labelKey }: { labelKey: string }) {
  const translate = useTranslate();
  // `labelKey` is a translation key or the caller's own label: the `{ _: }`
  // fallback renders it either way.
  return <p>{translate(labelKey, { _: labelKey })}</p>;
}

interface BooleanFieldProps<RecordType extends ResourceRecord = LooseRecord>
  extends FieldProps<RecordType> {
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  TrueIcon?: LucideIcon | null;
  FalseIcon?: LucideIcon | null;
  valueLabelTrue?: string;
  valueLabelFalse?: string;
  looseValue?: boolean;
}

export { BooleanField, type BooleanFieldProps };
