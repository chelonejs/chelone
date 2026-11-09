import {
  type BlockDocNode,
  isBlockDoc,
  isEmptyBlockDocument,
  type SourceProp,
} from "@chelone/core";
import type { ReactNode } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useResourceContext } from "../../resource";
import type { InputProps } from "../admin/input-props";
import { BlockEditor } from "./block-editor";
import type { BlockDefinition } from "./block-nodes";

const frameClass =
  "overflow-hidden rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive";

function BlockEditorLabel({
  id,
  label,
  source,
  resource,
  isRequired,
}: {
  id: string;
  label: ReactNode | false | undefined;
  source: string;
  resource: string | undefined;
  isRequired: boolean;
}) {
  if (label === false) return null;
  return (
    <FieldLabel htmlFor={id}>
      <FieldLabelText
        label={label}
        source={source}
        resource={resource}
        isRequired={isRequired}
      />
    </FieldLabel>
  );
}

/**
 * Edits a block document: rich text and app-defined blocks, stored as tiptap
 * JSON. An empty document is stored as `null`, so `required()` rejects it.
 *
 * Needs the optional `@tiptap/*` peers.
 *
 * @example
 * import { BlockEditorInput, defineBlock } from "@chelone/react/block-editor";
 *
 * <BlockEditorInput source="body" blocks={[callout]} />
 */
function BlockEditorInput(props: BlockEditorInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    disabled,
    readOnly,
    blocks,
    placeholder,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    format,
    parse,
    onBlur,
    onChange,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  const { id, field, fieldState, isRequired } = useInput({
    source,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue: props.defaultValue ?? null,
    format,
    parse,
    onBlur,
    onChange,
  });

  const invalid = fieldState.invalid;
  const error = fieldState.error;
  const value = isBlockDoc(field.value) ? field.value : null;
  const editable = disabled !== true && readOnly !== true;

  const write = (doc: BlockDocNode) =>
    field.onChange(isEmptyBlockDocument(doc) ? null : doc);

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      <BlockEditorLabel
        id={id}
        label={label}
        source={source}
        resource={resource}
        isRequired={isRequired}
      />
      <div
        id={id}
        data-slot="block-editor-input"
        aria-invalid={invalid || undefined}
        className={`${frameClass}${editable ? "" : " opacity-60"}`}
      >
        <BlockEditor
          value={value}
          blocks={blocks}
          editable={editable}
          placeholder={placeholder}
          onChange={write}
          onBlur={() => field.onBlur()}
        />
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {error && invalid ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface BlockEditorInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath> {
  className?: string;
  /** Read once, when the editor mounts. */
  blocks?: readonly BlockDefinition[];
  placeholder?: string;
}

export { BlockEditorInput, type BlockEditorInputProps };
