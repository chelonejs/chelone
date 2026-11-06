import type { LooseRecord } from "@chelone/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  EditorContext,
  type UseEditorOptions,
  useEditor,
} from "@tiptap/react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useResourceContext } from "../../resource";
import type {
  InputFieldError,
  InputProps,
  LooseFormatProps,
} from "../admin/input-props";
import { createRichTextExtensions } from "./rich-text-extensions";
import {
  type RichTextImageOptions,
  resolveRichTextImageConfig,
} from "./rich-text-image";
import { RichTextToolbar } from "./rich-text-toolbar";
import "./rich-text.css";

interface RichTextInputProps<TRecord = LooseRecord>
  extends Omit<InputProps<TRecord>, "format">,
    LooseFormatProps {
  className?: string;
  /** Shown while the editor is empty. */
  placeholder?: string;
  /**
   * Replaces the default toolbar. `null` hides the toolbar. Render
   * `<RichTextToolbar />` inside it to keep the default one.
   */
  toolbar?: ReactNode;
  /**
   * Images: `false` leaves out the image extension and the toolbar's Image
   * button. Options set the file rules (`allowedMimeTypes`, `maxFileSize`,
   * `allowBase64`), `uploadFn` to store a file and return its URL, and
   * `onImageError` for a refused file or a failed upload. Without `uploadFn`
   * a file is stored as a data URL when `allowBase64` is on. Default `true`.
   */
  images?: boolean | RichTextImageOptions;
  /**
   * Extra tiptap editor options, spread last: `extensions` here replaces the
   * default set. `onUpdate` and `onBlur` run after the input's own.
   */
  editorOptions?: Partial<UseEditorOptions>;
}

/**
 * Edits an HTML string in a tiptap editor with a formatting toolbar.
 *
 * Needs the optional `@tiptap/*` peers. The value is always an HTML string, and
 * the editor's schema decides what survives: scripts, frames, event handlers and
 * unsafe link URLs are dropped. From npm, import
 * `@chelone/react/rich-text-input.css` once for the content styles.
 *
 * @example
 * import { RichTextInput } from "@chelone/react/rich-text-input";
 *
 * <RichTextInput source="body" label="Article" />
 */
function RichTextInput<TRecord = LooseRecord>(
  props: RichTextInputProps<TRecord>,
) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    disabled,
    readOnly,
    onBlur,
    placeholder,
    toolbar,
    images = true,
    editorOptions,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  const { id, field, fieldState, isRequired } = useInput({
    ...props,
    // Called below with the editor's blur event.
    onBlur: undefined,
    defaultValue: props.defaultValue ?? "",
    // Identity, so clearing the editor stores "" and not null.
    parse: props.parse ?? ((value) => value),
  });

  const labelId = `${id}-label`;
  const value = typeof field.value === "string" ? field.value : "";
  const editable = disabled !== true && readOnly !== true;

  // `field` is a new object per render; the editor gets handlers that stay put.
  const fieldRef = useRef(field);
  fieldRef.current = field;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  // The extension reads the text on each render, so a new one needs no new editor.
  const placeholderRef = useRef(placeholder ?? "");
  placeholderRef.current = placeholder ?? "";
  // Likewise the image settings; only turning images on or off needs a new editor.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const imagesEnabled = images !== false;
  const extensions = useMemo(
    () =>
      createRichTextExtensions({
        placeholder: () => placeholderRef.current,
        images: imagesEnabled
          ? () => resolveRichTextImageConfig(imagesRef.current)
          : null,
      }),
    [imagesEnabled],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: value,
      editable,
      editorProps: {
        attributes: {
          class: "rich-text min-h-32 px-3 py-2 outline-none",
          ...(label === false ? {} : { "aria-labelledby": labelId }),
        },
      },
      ...editorOptions,
      onUpdate: (event) => {
        fieldRef.current.onChange(
          event.editor.isEmpty ? "" : event.editor.getHTML(),
        );
        editorOptions?.onUpdate?.(event);
      },
      onBlur: (event) => {
        // tiptap reports a DOM blur, not the React event `field.onBlur` takes.
        fieldRef.current.onBlur();
        onBlurRef.current?.(event.event);
        editorOptions?.onBlur?.(event);
      },
    },
    [imagesEnabled],
  );

  // `setEditable` and the placeholder text dispatch nothing, so an empty
  // transaction tells the toolbar and the placeholder decoration to read again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `placeholder` is read through its ref.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable, false);
    editor.view.dispatch(editor.state.tr);
  }, [editor, editable, placeholder]);

  // A reset or `setValue` changes the form value without the editor knowing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current === value) return;
    const { from, to } = editor.state.selection;
    editor.commands.setContent(value, { emitUpdate: false });
    // The old positions may lie past the end of the new document, or between blocks.
    const { doc, tr } = editor.state;
    const clamp = (pos: number) => doc.resolve(Math.min(pos, doc.content.size));
    editor.view.dispatch(
      tr.setSelection(TextSelection.between(clamp(from), clamp(to))),
    );
  }, [editor, value]);

  const context = useMemo(() => ({ editor }), [editor]);

  const invalid = fieldState.invalid;
  const error = fieldState.error;

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      <RichTextLabel
        id={id}
        labelId={labelId}
        onClick={() => editor?.commands.focus()}
        label={label}
        source={source}
        resource={resource}
        isRequired={isRequired}
      />
      <div
        id={id}
        data-slot="rich-text-input"
        aria-invalid={invalid || undefined}
        className={cn(
          "overflow-hidden rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive",
          !editable && "opacity-60",
        )}
      >
        <EditorContext.Provider value={context}>
          {toolbar === undefined ? <RichTextToolbar /> : toolbar}
          <EditorContent editor={editor} />
        </EditorContext.Provider>
      </div>
      <RichTextFooter
        helperText={helperText}
        error={invalid ? error : undefined}
      />
    </Field>
  );
}

function RichTextLabel({
  id,
  labelId,
  onClick,
  label,
  source,
  resource,
  isRequired,
}: {
  id: string;
  labelId: string;
  onClick: () => void;
  label: ReactNode | false;
  source: string;
  resource: string | undefined;
  isRequired: boolean;
}) {
  if (label === false) return null;
  return (
    <FieldLabel id={labelId} htmlFor={id} onClick={onClick}>
      <FieldLabelText
        label={label}
        source={source}
        resource={resource}
        isRequired={isRequired}
      />
    </FieldLabel>
  );
}

function RichTextFooter({
  helperText,
  error,
}: {
  helperText: ReactNode | false;
  error: InputFieldError;
}) {
  return (
    <>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {error ? <ValidationError error={error} /> : null}
      </FieldError>
    </>
  );
}

export { RichTextInput, type RichTextInputProps };
