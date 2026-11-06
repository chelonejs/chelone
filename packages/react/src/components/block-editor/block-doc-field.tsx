import type { LooseRecord } from "@chelone/core";
import { isBlockDoc } from "@chelone/core";
import type { FieldProps } from "@/lib/field-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { BlockEditor } from "./block-editor";
import type { BlockDefinition } from "./block-nodes";

interface BlockDocFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends Pick<
    FieldProps<RecordType>,
    "source" | "record" | "className" | "empty"
  > {
  /** Read once, when the editor mounts. Each block's `read` component draws it. */
  blocks?: readonly BlockDefinition[];
}

/**
 * Shows a stored block document read-only, drawing each block with its `read`
 * component. A missing value shows `empty`.
 *
 * Needs the optional `@tiptap/*` peers.
 *
 * @example
 * import { BlockDocField } from "@chelone/react/block-editor";
 *
 * <BlockDocField source="body" blocks={[callout]} empty="No content" />
 */
function BlockDocField<RecordType extends LooseRecord = LooseRecord>({
  source,
  record,
  blocks,
  className,
  empty,
}: BlockDocFieldProps<RecordType>) {
  const value = useFieldValue({ source, record });
  const translate = useTranslate();

  if (!isBlockDoc(value)) {
    return (
      <>{typeof empty === "string" ? translate(empty, { _: empty }) : empty}</>
    );
  }
  return (
    <div data-slot="block-doc-field" className={cn(className)}>
      <BlockEditor value={value} blocks={blocks} editable={false} />
    </div>
  );
}

export { BlockDocField, type BlockDocFieldProps };
