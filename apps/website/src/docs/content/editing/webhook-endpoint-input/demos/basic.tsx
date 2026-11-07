import { WebhookEndpointInput } from "@chelone/react";

export const mode = "input";

const EVENT_TYPES = ["order.created", "order.shipped", "post.published"];

/** `<WebhookEndpointInput>` edits an endpoint's URL, signing secret and event subscriptions, and can send a test ping. */
export default function WebhookEndpointInputDemo() {
  return (
    <div className="w-full max-w-md">
      <WebhookEndpointInput
        source="endpoint"
        label="Webhook endpoint"
        eventTypes={EVENT_TYPES}
        defaultValue={{
          url: "https://hooks.example.com/orders",
          secret: "whsec_8f3a1c7d92e04b56",
          eventTypes: ["order.created"],
        }}
        onTestPing={() => Promise.resolve()}
      />
    </div>
  );
}
