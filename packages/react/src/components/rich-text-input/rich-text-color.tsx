import {
  type RichTextColor,
  type RichTextColorPalette,
  richTextColors,
} from "@chelone/core";
import { type Editor, useEditorState } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";

const PALETTE_LABELS: Record<RichTextColorPalette, string> = {
  default: "Default",
  bright: "Bright",
  soft: "Soft",
  muted: "Muted",
};

/** Whether the editor has the color extension, which adds the toolbar's color button. */
function hasRichTextColor(editor: Editor): boolean {
  return editor.extensionManager.extensions.some(
    (extension) => extension.name === "color",
  );
}

/** The color at the selection, as stored: a palette `var(...)`, or `null` for none. */
function currentColor(editor: Editor): string | null {
  const { color } = editor.getAttributes("textStyle");
  return typeof color === "string" ? color : null;
}

function paletteGroups(): {
  palette: RichTextColorPalette;
  colors: RichTextColor[];
}[] {
  const groups: { palette: RichTextColorPalette; colors: RichTextColor[] }[] =
    [];
  for (const color of richTextColors) {
    const last = groups.at(-1);
    if (last?.palette === color.palette) last.colors.push(color);
    else groups.push({ palette: color.palette, colors: [color] });
  }
  return groups;
}

const groups = paletteGroups();

/**
 * The inline panel the toolbar's color button opens: swatches grouped by
 * palette. A swatch colors the selection; Default clears the color.
 */
function RichTextColorPanel({ editor }: { editor: Editor }) {
  const translate = useTranslate();
  const current = useEditorState({
    editor,
    selector: ({ editor: e }) => currentColor(e),
  });

  function pick(color: RichTextColor) {
    const chain = editor.chain().focus();
    if (color.value === null) chain.unsetColor().run();
    else chain.setColor(color.value).run();
  }

  return (
    <div
      data-slot="rich-text-color"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-2"
    >
      {groups.map(({ palette, colors }) => (
        <fieldset
          key={palette}
          aria-label={translate(`chelone.rich_text.color_palette.${palette}`, {
            _: PALETTE_LABELS[palette],
          })}
          className="m-0 flex min-w-0 items-center gap-1 border-0 p-0"
        >
          {colors.map((color) => {
            const label = translate(color.labelKey, { _: color.defaultLabel });
            return (
              <Button
                key={color.id}
                type="button"
                variant="outline"
                size="icon-sm"
                title={label}
                aria-label={label}
                aria-pressed={color.value === current}
                disabled={!editor.isEditable}
                // Keeps the editor's selection, which a button click would blur.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(color)}
                className={cn(
                  "size-6 rounded-full",
                  color.value === null && "text-xs",
                  color.value === current && "ring-2 ring-ring",
                )}
                style={
                  color.value ? { backgroundColor: color.value } : undefined
                }
              >
                {color.value === null ? "A" : null}
              </Button>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

export { hasRichTextColor, RichTextColorPanel };
