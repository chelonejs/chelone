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

const post = {
  id: 1,
  title: "Hello from the server",
  views: 1234,
  published_at: "2026-06-23",
  summary: null,
  website: "https://chelone.dev",
  contact: "editor@example.com",
  logo: "/chelone-mark.svg",
  logo_name: "Chelone logo",
  price: 1234.5,
  published: true,
  status: "in_review",
  rating: 3.5,
  votes: 128,
};

const statuses = [
  { id: "draft", name: "Draft" },
  { id: "in_review", name: "In review" },
  { id: "published", name: "Published" },
];

/** The server fields over a post passed as a prop. */
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
      <dt>Price</dt>
      <dd>
        <ServerCurrencyField
          record={post}
          source="price"
          currency="USD"
          displayLocale="en-US"
        />
      </dd>
      <dt>Public</dt>
      <dd>
        <ServerBooleanField record={post} source="published" />
      </dd>
      <dt>Status</dt>
      <dd>
        <ServerSelectField record={post} source="status" choices={statuses} />
      </dd>
      <dt>Rating</dt>
      <dd>
        <ServerRatingField
          record={post}
          source="rating"
          allowHalf
          countSource="votes"
        />
      </dd>
      <dt>Summary</dt>
      <dd>
        <ServerTextField record={post} source="summary" empty="No summary" />
      </dd>
      <dt>Website</dt>
      <dd>
        <ServerUrlField record={post} source="website" target="_blank" />
      </dd>
      <dt>Contact</dt>
      <dd>
        <ServerEmailField record={post} source="contact" />
      </dd>
      <dt>Logo file</dt>
      <dd>
        <ServerFileField
          record={post}
          source="logo"
          title="logo_name"
          download="chelone-mark.svg"
        />
      </dd>
      <dt>Logo</dt>
      <dd>
        <ServerImageField
          record={post}
          source="logo"
          title="logo_name"
          className="[&_img]:size-12"
        />
      </dd>
    </dl>
  );
}
