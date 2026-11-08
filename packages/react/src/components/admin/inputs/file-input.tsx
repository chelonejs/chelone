import type {
  FileEntry,
  FileSelection,
  SourceProp,
  TransformedFile,
} from "@chelone/core";
import {
  fileEntryKey,
  fileEntryPreview,
  toFileEntries,
  toFileSelection,
} from "@chelone/core";
import { XCircle } from "lucide-react";
import type * as React from "react";
import {
  Children,
  type ComponentType,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
  useEffect,
} from "react";
import type {
  DropEvent,
  DropzoneInputProps,
  DropzoneOptions,
  FileRejection,
} from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { RecordContextProvider } from "../../../record/record-context";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import { shallowEqual } from "../../../util/shallow-equal";
import type { InputProps } from "../input-props";

/**
 * File upload input with drag-and-drop support and preview capabilities.
 *
 * Use `<FileInput>` for document uploads, images, PDFs, CSV files, or any file
 * attachment field. Powered by react-dropzone with support for multiple files,
 * file-type restrictions (`accept`), and size constraints. Pass a child
 * component (typically `<FileField>`) to render file previews — each existing
 * file is published to the child through a per-file `<RecordContextProvider>`.
 *
 * @see {@link https://react-dropzone.js.org/ React Dropzone documentation}
 *
 * @example
 * import { Edit, TextInput, FileInput, FileField } from '@/components/admin';
 *
 * const DocumentEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *     <FileInput source="attachments" multiple accept={{ 'image/*': [], 'application/pdf': [] }}>
 *       <FileField source="src" title="title" />
 *     </FileInput>
 *   </Edit>
 * );
 */
function FileInput(props: FileInputProps) {
  const {
    defaultValue,
    format: formatProp,
    label,
    helperText,
    onBlur: onBlurProp,
    onChange: onChangeProp,
    parse: parseProp,
    resource,
    source,
    validate,
    readOnly,
    disabled,

    accept,
    maxSize,
    minSize,
    multiple = false,
    options = {},

    children,
    className,
    inputProps: inputPropsOptions,

    onRemove: onRemoveProp,
    validateFileRemoval,

    placeholder,
    labelMultiple = "chelone.input.file.upload_several",
    labelSingle = "chelone.input.file.upload_single",
    removeIcon,
    ...rest
  } = props;
  const { onDrop: onDropProp } = options;
  const translate = useTranslate();

  // turn a browser dropped file structure into expected structure
  const transformFile = (file: FileEntry): FileEntry => {
    if (!(file instanceof File)) {
      return file;
    }

    const preview = URL.createObjectURL(file);
    const transformedFile: TransformedFile = {
      rawFile: file,
      src: preview,
      title: file.name,
    };

    return transformedFile;
  };

  const transformFiles = (files: FileSelection): FileSelection => {
    if (!files) {
      return multiple ? [] : null;
    }

    if (Array.isArray(files)) {
      return files.map(transformFile);
    }

    return transformFile(files);
  };

  const format = formatProp ?? transformFiles;
  const parse = parseProp ?? transformFiles;

  // `format` and `parse` run here on the files, so the binding keeps its
  // defaults.
  const {
    id,
    field: { onChange, onBlur, value, name },
    isRequired,
    fieldState,
  } = useInput({
    defaultValue,
    onBlur: onBlurProp,
    onChange: onChangeProp,
    source,
    validate,
  });
  const files = toFileEntries(format(toFileSelection(value)));

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const onDrop = (
    newFiles: File[],
    rejectedFiles: FileRejection[],
    event: DropEvent,
  ) => {
    const updatedFiles = multiple ? [...files, ...newFiles] : [...newFiles];

    if (multiple) {
      onChange(parse(updatedFiles));
      onBlur();
    } else {
      onChange(parse(updatedFiles[0] ?? null));
      onBlur();
    }

    if (onDropProp) {
      onDropProp(newFiles, rejectedFiles, event);
    }
  };

  const onRemove = (file: FileEntry) => async () => {
    if (validateFileRemoval) {
      try {
        await validateFileRemoval(file);
      } catch {
        return;
      }
    }

    if (multiple) {
      const filteredFiles = files.filter(
        (stateFile) => !shallowEqual(stateFile, file),
      );
      onChange(parse(filteredFiles));
      onBlur();
    } else {
      onChange(parse(null));
      onBlur();
    }

    if (onRemoveProp) {
      onRemoveProp(file);
    }
  };

  const onlyChild = children ? Children.only(children) : undefined;
  const childrenElement = isValidElement(onlyChild) ? onlyChild : undefined;

  const { getRootProps, getInputProps } = useDropzone({
    accept,
    maxSize,
    minSize,
    multiple,
    disabled: disabled || readOnly,
    ...options,
    onDrop,
  });

  return (
    <Field
      className={cn("w-full", className)}
      data-invalid={invalid || undefined}
      {...sanitizeInputRestProps(rest)}
    >
      <FieldLabel
        htmlFor={id}
        className={disabled || readOnly ? "cursor-default" : "cursor-pointer"}
      >
        <FieldLabelText
          label={label}
          source={source}
          resource={resource}
          isRequired={isRequired}
        />
      </FieldLabel>

      <div
        {...getRootProps({
          className: cn(
            "border-2 border-dashed border-muted rounded-lg p-6 text-center transition-colors",
            "hover:border-sidebar-ring focus:outline-none",
            disabled || readOnly
              ? "bg-muted cursor-not-allowed"
              : "bg-muted text-muted-foreground cursor-pointer",
            invalid && "border-destructive",
          ),
        })}
      >
        <input
          id={id}
          name={name}
          aria-invalid={invalid || undefined}
          {...getInputProps({
            ...inputPropsOptions,
          })}
        />

        {placeholder ? (
          placeholder
        ) : multiple ? (
          <p className="text-sm">{translate(labelMultiple)}</p>
        ) : (
          <p className="text-sm">{translate(labelSingle)}</p>
        )}
      </div>

      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>

      {children && (
        <div className="previews flex flex-col gap-1">
          {files.map((file, index) => (
            <FileInputPreview
              key={fileEntryKey(file, index)}
              file={file}
              onRemove={onRemove(file)}
              removeIcon={removeIcon}
            >
              <RecordContextProvider<FileEntry> value={file}>
                {childrenElement}
              </RecordContextProvider>
            </FileInputPreview>
          ))}
        </div>
      )}
    </Field>
  );
}

type FileInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = Omit<InputProps<TRecord, TPath>, "type" | "format" | "parse"> & {
  /** Read transform (the files in the form → the files shown). Default makes a preview record of each dropped file. */
  format?: (value: FileSelection) => FileSelection;
  /** Write transform (the dropped or remaining files → stored value). Default makes a preview record of each dropped file. */
  parse?: (value: FileSelection) => FileSelection;
  accept?: DropzoneOptions["accept"];
  className?: string;
  children?: ReactNode;
  labelMultiple?: string;
  labelSingle?: string;
  maxSize?: DropzoneOptions["maxSize"];
  minSize?: DropzoneOptions["minSize"];
  multiple?: DropzoneOptions["multiple"];
  options?: DropzoneOptions;
  onRemove?: (file: FileEntry) => void;
  placeholder?: ReactNode;
  removeIcon?: ComponentType<{ className?: string }>;
  inputProps?: DropzoneInputProps & React.ComponentProps<"input">;
  validateFileRemoval?(file: FileEntry): boolean | Promise<boolean>;
};

/**
 * Preview container for uploaded files in `<FileInput>`, with a remove button.
 *
 * @internal
 */
function FileInputPreview(props: FileInputPreviewProps) {
  const {
    className,
    children,

    file,
    onRemove,
    removeIcon: RemoveIcon = XCircle,

    ...rest
  } = props;

  const translate = useTranslate();

  useEffect(() => {
    return () => {
      const preview = fileEntryPreview(file);

      if (preview) {
        window.URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  return (
    <div
      className={cn("flex flex-row gap-1 group", className)}
      {...sanitizeInputRestProps(rest)}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 rounded-full shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        aria-label={translate("chelone.action.delete")}
        title={translate("chelone.action.delete")}
      >
        <RemoveIcon className="size-4" />
      </Button>
      {children}
    </div>
  );
}

interface FileInputPreviewProps extends HTMLAttributes<HTMLDivElement> {
  file: FileEntry;
  onRemove: () => void;
  removeIcon?: React.ComponentType<{ className?: string }>;
}

export {
  FileInput,
  FileInputPreview,
  type FileInputPreviewProps,
  type FileInputProps,
  type TransformedFile,
};
