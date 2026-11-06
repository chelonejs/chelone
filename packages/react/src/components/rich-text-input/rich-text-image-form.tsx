import { isSafeImageSrc } from "@chelone/core";
import type { Editor } from "@tiptap/core";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "../../i18n-hooks";
import { getRichTextImageConfig } from "./rich-text-image";
import { RichTextUrlForm } from "./rich-text-url-form";

/**
 * The toolbar's inline image panel: a URL to insert, and an Upload button for
 * files. Both go through the editor's `setImages` command.
 */
function RichTextImageForm({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function apply() {
    const src = url.trim();
    if (src === "") return;
    const allowDataImages =
      getRichTextImageConfig(editor)?.rules.allowBase64 ?? false;
    if (!isSafeImageSrc(src, { allowDataImages })) {
      setInvalid(true);
      return;
    }
    editor.chain().focus().setImages([{ src }]).run();
    onClose();
  }

  return (
    <RichTextUrlForm
      slot="rich-text-image-form"
      label={translate("chelone.rich_text.image_url", { _: "Image URL" })}
      applyLabel={translate("chelone.rich_text.image_apply", { _: "Apply" })}
      error={
        invalid
          ? translate("chelone.rich_text.invalid_image_url", {
              _: "Enter a link to an image",
            })
          : null
      }
      value={url}
      onSubmit={apply}
      onChange={(next) => {
        setUrl(next);
        setInvalid(false);
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        // Keeps the editor's selection, which a button click would blur.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => fileInput.current?.click()}
      >
        {translate("chelone.rich_text.image_upload", { _: "Upload" })}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label={translate("chelone.rich_text.image_upload", {
          _: "Upload",
        })}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // The same file can then be chosen again.
          event.target.value = "";
          if (files.length === 0) return;
          editor.chain().focus().setImages(files).run();
          onClose();
        }}
      />
    </RichTextUrlForm>
  );
}

export { RichTextImageForm };
