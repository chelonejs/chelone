import { NumberInput } from "@chelone/react";

export const mode = "input";

/** `<NumberInput>` holds a post's view count as a number, with the field floored at zero and filled with 137. */
export default function NumberInputDemo() {
  return (
    <div className="w-full max-w-xs">
      <NumberInput source="views" min={0} step={10} defaultValue={137} />
    </div>
  );
}
