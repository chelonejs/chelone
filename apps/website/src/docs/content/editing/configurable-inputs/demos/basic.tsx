import { NumberInput, TextInput } from "@chelone/react";
import {
  ConfigurableInputs,
  Inspector,
  InspectorButton,
} from "@chelone/react/inspector";

export const mode = "input";

/** `<ConfigurableInputs>` lets the user hide and reorder these inputs from the inspector. */
export default function ConfigurableInputsDemo() {
  return (
    <Inspector>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <InspectorButton />
        <ConfigurableInputs className="flex flex-col gap-4">
          <TextInput source="title" defaultValue="On Computable Numbers" />
          <TextInput
            source="body"
            defaultValue="Notes on the Entscheidungsproblem"
          />
          <NumberInput source="views" defaultValue={187} />
        </ConfigurableInputs>
      </div>
    </Inspector>
  );
}
