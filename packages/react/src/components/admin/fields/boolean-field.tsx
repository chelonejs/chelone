import type {
  LooseRecord,
  ResourceRecord,
  SourceProp,
  SourceValue,
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
  const isTruthyValue = value === true || (looseValue && value);
  const baseClassName = "size-5 text-foreground";

  if (looseValue || typeof value === "boolean") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {isTruthyValue ? (
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
          <RenderLabel
            value={!!value}
            valueLabelFalse={valueLabelFalse}
            valueLabelTrue={valueLabelTrue}
          />
        </TooltipContent>
      </Tooltip>
    );
  }

  return <>{empty}</>;
}

function RenderLabel({
  value,
  valueLabelTrue,
  valueLabelFalse,
}: Pick<BooleanFieldProps, "valueLabelFalse" | "valueLabelTrue"> & {
  value: boolean;
}) {
  const translate = useTranslate();

  let label = value ? valueLabelTrue : valueLabelFalse;
  if (!label) {
    label = value ? "chelone.boolean.true" : "chelone.boolean.false";
  }
  if (typeof label === "string") {
    label = translate(label, { _: label });
  }

  return <p>{label}</p>;
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
