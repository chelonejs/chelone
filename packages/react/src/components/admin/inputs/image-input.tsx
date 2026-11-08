import { type FileEntry, fileEntryImage } from "@chelone/core";
import {
  FileInput,
  type FileInputProps,
} from "@/components/admin/inputs/file-input";
import { useRecordContext } from "../../../record/record-context";

/**
 * Image upload input with drag-and-drop support and thumbnail previews.
 *
 * Use `<ImageInput>` for image attachments. It is a thin wrapper around
 * `<FileInput>` that defaults `accept` to `{ "image/*": [] }` and, when no child
 * is supplied, renders an inline `<img>` thumbnail per file.
 *
 * ## chelone divergence from shadmin
 * shadmin's default preview child is `<ImageField source="src" title="title" />`.
 * The `<ImageField>` field component is NOT part of the P7c input wave (fields
 * are ported separately), so the default child here is a small local
 * {@link ImageInputThumbnail} that reads the per-file `RecordContext` (published
 * by `<FileInput>`) and renders an `<img>` with the file's `src`/`title` — the
 * same visible output for the single-file record shape file previews carry. Pass
 * an explicit child (e.g. a ported `<ImageField>`) to override it.
 *
 * @example
 * import { Edit, ImageInput, ImageField } from '@/components/admin';
 *
 * const ProductEdit = () => (
 *   <Edit>
 *     <ImageInput source="pictures" multiple>
 *       <ImageField source="src" title="title" />
 *     </ImageInput>
 *   </Edit>
 * );
 */
function ImageInput(props: ImageInputProps) {
  const {
    accept = { "image/*": [] },
    labelMultiple = "chelone.input.image.upload_several",
    labelSingle = "chelone.input.image.upload_single",
    children,
    ...rest
  } = props;

  return (
    <FileInput
      accept={accept}
      labelMultiple={labelMultiple}
      labelSingle={labelSingle}
      {...rest}
    >
      {children ?? <ImageInputThumbnail />}
    </FileInput>
  );
}

/**
 * Default per-file image preview for `<ImageInput>` — reads the ambient file
 * entry (`{ src, title }` or a stored URL) that `<FileInput>` publishes and
 * renders it as a thumbnail `<img>`. A stand-in for shadmin's `<ImageField>` default child until
 * fields are ported.
 *
 * @internal
 */
function ImageInputThumbnail() {
  const image = fileEntryImage(useRecordContext<FileEntry>());
  if (!image) return null;
  return (
    <img
      src={image.src}
      title={image.title}
      alt={image.title}
      className="h-24 w-24 rounded-md object-cover"
    />
  );
}

type ImageInputProps = FileInputProps;

export { ImageInput, type ImageInputProps };
