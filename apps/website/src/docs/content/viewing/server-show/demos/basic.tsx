import {
  ServerNumberField,
  ServerRecordField,
  ServerShow,
  ServerTextField,
} from "@chelone/react/rsc";

const post = {
  id: 1,
  title: "Hello from the server",
  views: 1234,
  status: "published",
};

/**
 * `<ServerShow>` over a record the page already holds. The heading is the
 * record's own title, and the action is a plain link: an app would put its
 * client `<Edit>` link here.
 */
export default function ServerShowDemo() {
  return (
    <ServerShow
      record={post}
      actions={<a href="/docs/page-components/edit">Edit</a>}
    >
      <ServerRecordField label="Title">
        <ServerTextField record={post} source="title" />
      </ServerRecordField>
      <ServerRecordField label="Views" variant="inline">
        <ServerNumberField record={post} source="views" locales="en-US" />
      </ServerRecordField>
      <ServerRecordField label="Status" variant="inline">
        <ServerTextField record={post} source="status" />
      </ServerRecordField>
    </ServerShow>
  );
}
