import { echoAssistantTransport } from "@chelone/core";
import { Assistant } from "@chelone/react";

const transport = echoAssistantTransport();

/**
 * `<Assistant>` is fixed to the viewport. The transform makes this box its
 * containing block, so the button and the panel stay inside the preview.
 */
export default function AssistantDemo() {
  return (
    <div className="relative h-80 w-full max-w-xl transform-gpu overflow-hidden rounded-md border">
      <p className="p-4 text-muted-foreground text-sm">
        Ask anything. This transport echoes your question back, with no model
        behind it.
      </p>
      <Assistant
        transport={transport}
        welcomeMessage="Hi! Type a question and I will echo it."
      />
    </div>
  );
}
