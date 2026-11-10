/**
 * `/rsc/fields`: the server fields, rendered in a React Server Component. A
 * server function reads post 1 and its latest comment from the process-wide
 * provider, and the post's author and a product from the seed, and returns the
 * rendered fields; the page shows what the loader got, and ships no field code
 * to the browser.
 */

import { seedData } from "@chelone/demo-data";
import {
  ServerBooleanField,
  ServerCurrencyField,
  ServerDateField,
  ServerEmailField,
  ServerFileField,
  ServerImageField,
  ServerNumberField,
  ServerRatingField,
  ServerSelectField,
  ServerTextField,
  ServerUrlField,
} from "@chelone/react/rsc";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { renderServerComponent } from "@tanstack/react-start/rsc";
import { serverDataProvider } from "../../server-data";

const postStatuses = [
  { id: "draft", name: "Draft" },
  { id: "in_review", name: "In review" },
  { id: "published", name: "Published" },
];

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
  // This app registers only posts and comments, and writes neither authors nor
  // products, so both come straight from the seed.
  const { authors, products } = seedData();
  const author = authors.find(({ id }) => id === post.author_id);
  const [product] = products;
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
      <dt>Published</dt>
      <dd>
        <ServerBooleanField record={post} source="published" />
      </dd>
      <dt>Status</dt>
      <dd>
        <ServerSelectField
          record={post}
          source="status"
          choices={postStatuses}
        />
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
      <dt>Author email</dt>
      <dd>
        {author ? (
          <ServerEmailField record={author} source="email" />
        ) : (
          "No author"
        )}
      </dd>
      {product ? (
        <>
          <dt>Price</dt>
          <dd>
            <ServerCurrencyField
              record={product}
              source="price"
              currency="USD"
              displayLocale="en-US"
            />
          </dd>
          <dt>Rating</dt>
          <dd>
            <ServerRatingField record={product} source="rating" allowHalf />
          </dd>
          <dt>Featured</dt>
          <dd>
            <ServerBooleanField
              record={product}
              source="featured"
              empty="Not decided"
            />
          </dd>
          <dt>Product page</dt>
          <dd>
            <ServerUrlField
              record={product}
              source="url"
              content={product.name}
              target="_blank"
            />
          </dd>
          <dt>Spec sheet</dt>
          <dd>
            <ServerFileField
              record={product}
              source="spec_sheet"
              title="Spec sheet"
            />
          </dd>
          <dt>Photo</dt>
          <dd>
            <ServerImageField record={product} source="image" title="name" />
          </dd>
        </>
      ) : null}
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
