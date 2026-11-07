import {
  Configurable,
  Inspector,
  InspectorButton,
} from "@chelone/react/inspector";

/** `<Inspector>` opens its panel while configure mode is on. Press the button, then Customize on the outlined box. */
export default function InspectorDemo() {
  return (
    <Inspector>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <InspectorButton />
        <Configurable
          preferenceKey="docs-demo"
          title="Greeting"
          editor={
            <p className="text-sm">
              The editor of a piece goes here, in the panel.
            </p>
          }
          className="rounded-md p-4"
        >
          <p className="font-medium">Welcome back to the posts admin.</p>
        </Configurable>
      </div>
    </Inspector>
  );
}
