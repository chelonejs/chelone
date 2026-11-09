import {
  ServerDateField,
  ServerNumberField,
  ServerTextField,
} from "@chelone/react/rsc";

const post = {
  id: 1,
  title: "Hello from the server",
  views: 1234,
  published_at: "2026-06-23",
  summary: null,
};

/** The three server fields over a post passed as a prop. */
export default function ServerFieldsDemo() {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt>Title</dt>
      <dd>
        <ServerTextField record={post} source="title" />
      </dd>
      <dt>Views</dt>
      <dd>
        <ServerNumberField record={post} source="views" locales="en-US" />
      </dd>
      <dt>Published</dt>
      <dd>
        <ServerDateField
          record={post}
          source="published_at"
          locales="en-US"
          options={{ dateStyle: "long", timeZone: "UTC" }}
        />
      </dd>
      <dt>Summary</dt>
      <dd>
        <ServerTextField record={post} source="summary" empty="No summary" />
      </dd>
    </dl>
  );
}
