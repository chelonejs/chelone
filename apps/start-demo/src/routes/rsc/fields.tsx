/**
 * `/rsc/fields`: the server fields, rendered in a React Server Component. A
 * server function reads post 1 and its latest comment from the process-wide
 * provider and returns the rendered fields; the page shows what the loader got,
 * and ships no field code to the browser.
 */

import {
  ServerDateField,
  ServerNumberField,
  ServerTextField,
} from "@chelone/react/rsc";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { serverDataProvider } from "../../server-data";

const getPostFields = createServerFn().handler(async () => {
  const { data: post } = await serverDataProvider.getOne("posts", { id: 1 });
  // A post holds no date, so the date field shows its latest comment's.
  const {
    data: [comment],
  } = await serverDataProvider.getManyReference("comments", {
    target: "post_id",
    id: post.id,
    pagination: { page: 1, perPage: 1 },
    sort: { field: "createdAt", order: "DESC" },
  });
  return renderServerComponent(
    <dl>
      <dt>Title</dt>
      <dd>
        <ServerTextField record={post} source="title" />
      </dd>
      <dt>Views</dt>
      <dd>
        <ServerNumberField record={post} source="views" locales="en-US" />
      </dd>
      <dt>Latest comment</dt>
      <dd>
        {comment ? (
          <ServerDateField
            record={comment}
            source="createdAt"
            locales="en-US"
            showTime
          />
        ) : (
          "No comments"
        )}
      </dd>
    </dl>,
  );
});

export const Route = createFileRoute("/rsc/fields")({
  loader: () => getPostFields(),
  component: FieldsPage,
});

function FieldsPage() {
  return (
    <main>
      <h1>Server fields</h1>
      {Route.useLoaderData()}
    </main>
  );
}
