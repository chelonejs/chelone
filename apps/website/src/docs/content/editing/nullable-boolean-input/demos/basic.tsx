import { Create, NullableBooleanInput } from "@chelone/react";

// The select names its option only when the value is already there at the first
// render, so the demo seeds a create form instead of passing `defaultValue`.
/** `<NullableBooleanInput>` picks between Yes, No and unknown for `published`; the seeded record says Yes. */
export default function NullableBooleanInputDemo() {
  return (
    <Create resource="posts" record={{ published: true }}>
      <div className="w-full max-w-xs">
        <NullableBooleanInput source="published" />
      </div>
    </Create>
  );
}
