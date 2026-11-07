import { RecordContextProvider, WebhookEndpointField } from "@chelone/react";

export const mode = "record";

const endpoints = [
  {
    id: 1,
    endpoint: {
      url: "https://hooks.example.com/orders",
      secret: "whsec_1",
      eventTypes: ["order.created"],
      lastDelivery: { status: "ok", at: "2026-11-07T08:00:00Z" },
    },
  },
  {
    id: 2,
    endpoint: {
      url: "https://hooks.example.com/shipping",
      secret: "whsec_2",
      eventTypes: ["order.shipped"],
      lastDelivery: { status: "failed", at: "2026-11-07T08:05:00Z" },
    },
  },
  {
    id: 3,
    endpoint: {
      url: "https://hooks.example.com/cms",
      secret: "whsec_3",
      eventTypes: ["post.published"],
    },
  },
];

/** `<WebhookEndpointField>` shows an endpoint's URL and the status of its last delivery; the signing secret is never rendered. */
export default function WebhookEndpointFieldDemo() {
  return (
    <ul className="flex flex-col gap-2">
      {endpoints.map((record) => (
        <li key={record.id}>
          <RecordContextProvider value={record}>
            <WebhookEndpointField source="endpoint" />
          </RecordContextProvider>
        </li>
      ))}
    </ul>
  );
}
