/**
 * QUICKSTART — "point at a Zod schema" resource.
 *
 * `postSchema` (below) is registered via `defineResources({ posts: { schema:
 * postSchema } })` in `App.tsx` and passed to `<Admin resources={...}>`. Because
 * the resource carries a Zod schema, the Edit/Create forms get AUTOMATIC
 * validation from it (the D6 default validator): the controller reads the
 * registry schema and validates the form against it on submit — no per-field
 * `validate={...}` props needed. Zod ≥ 3.24 implements Standard Schema, so the
 * schema plugs straight into the form-core validation seam.
 *
 * Try it: open a post's Edit page, clear the Title, and submit — the schema's
 * `.min(1)` rule blocks the save and surfaces the message.
 */

import { isLooseRecord, type LooseRecord } from "@chelone/core";
import {
  CommentsThread,
  createResourceComponents,
  DataTable,
  DiffViewer,
  DualApprovalButton,
  EditButton,
  EditLive,
  InPlaceEditor,
  ListContextProvider,
  ListLive,
  ListPagination,
  LockOnMount,
  LockStatus,
  PresenceBar,
  RecordTimeline,
  SaveButton,
  ShowLive,
  TextField,
  Title,
  Toolbar,
  useGetList,
  useList,
  useParams,
  useRecordContext,
} from "@chelone/react";
import {
  Configurable,
  ConfigurableInputs,
  SortableFieldsSelector,
} from "@chelone/react/inspector";
import { type ReactNode, useMemo, useState } from "react";
import { z } from "zod";
import { SimulatedViewer, SimulateOtherUser } from "../realtime-sim";

const posts = createResourceComponents("posts");

/** The record shape + the form validator, in one place. */
export const postSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().min(1, "Body is required"),
  author_id: z.number({ message: "Pick an author" }),
  views: z.number().min(0).optional(),
  published: z.boolean().optional(),
  status: z.enum(["draft", "in_review", "published", "rejected"]).optional(),
  /** The ids of the users who approved the post, written by `<DualApprovalButton>`. */
  approvers: z.array(z.union([z.number(), z.string()])).optional(),
  /** Unused by the forms; gives `register-proof` an array for a bracket path. */
  tags: z.array(z.object({ label: z.string() })).optional(),
});

export function PostList() {
  return (
    <ListLive actions={<SimulateOtherUser />}>
      {/* Configure mode outlines the table so its columns can be hidden and
          reordered from the inspector. The table publishes them under
          `posts.datatable`, which is what the editor reads. */}
      <Configurable
        preferenceKey="posts.columns"
        title="Columns"
        editor={<SortableFieldsSelector storeKey="posts.datatable" />}
      >
        <DataTable>
          <DataTable.Col source="title" />
          <DataTable.Col label="Author">
            <posts.ReferenceField source="author_id" reference="authors">
              <TextField source="name" />
            </posts.ReferenceField>
          </DataTable.Col>
          <DataTable.NumberCol source="views" />
          <DataTable.Col source="published">
            <posts.BooleanField source="published" />
          </DataTable.Col>
          <DataTable.Col>
            <EditButton />
          </DataTable.Col>
        </DataTable>
      </Configurable>
      <ListPagination />
    </ListLive>
  );
}

export function PostEdit() {
  return (
    <EditLive>
      <div className="mb-4 empty:hidden">
        <LockStatus />
      </div>
      <LockOnMount identity="you">
        {/* The user hides the inputs they never fill from the inspector. A
            hidden input keeps its loaded value, so the schema still passes. */}
        <ConfigurableInputs className="flex flex-col gap-4">
          <posts.TextInput source="title" />
          <posts.TextInput source="body" multiline />
          <posts.ReferenceInput source="author_id" reference="authors">
            <posts.SelectInput optionText="name" />
          </posts.ReferenceInput>
          <posts.NumberInput source="views" min={0} />
          <posts.BooleanInput source="published" />
        </ConfigurableInputs>
        <Toolbar />
      </LockOnMount>
    </EditLive>
  );
}

export function PostCreate() {
  return (
    <posts.Create>
      <posts.TextInput source="title" />
      <posts.TextInput source="body" multiline />
      <posts.ReferenceInput source="author_id" reference="authors">
        <posts.SelectInput optionText="name" />
      </posts.ReferenceInput>
      <posts.NumberInput source="views" min={0} defaultValue={0} />
      <posts.BooleanInput source="published" defaultValue={false} />
      <SaveButton />
    </posts.Create>
  );
}

/** The fields the diff compares: the ones a reviewer can change on this page. */
const DIFF_SOURCES = ["title", "status", "approvers"] as const;

/**
 * What changed on this post since the page opened: edit the title in place or
 * approve it and the row moves. The post stores no revision bodies, so the
 * opening copy stands in for the earlier revision.
 */
function PostChanges() {
  const record = useRecordContext();
  const [opened, setOpened] = useState<LooseRecord>();
  if (record && !opened) setOpened(structuredClone(record));
  if (!record || !opened) return null;
  return (
    <DiffViewer
      before={opened}
      after={record}
      sources={DIFF_SOURCES}
      labels={{ approvers: "Approved by" }}
    />
  );
}

/** The post's revisions as a dated list, newest first, with the author's name. */
function PostTimeline() {
  const record = useRecordContext();
  const { data: authors } = useGetList("authors", {
    pagination: { page: 1, perPage: 100 },
  });
  const entries = useMemo(() => {
    const names = new Map(
      (authors?.data ?? []).map((author) => [author.id, author.name]),
    );
    const revisions = Array.isArray(record?.revisions) ? record.revisions : [];
    return revisions.flatMap((revision) =>
      isLooseRecord(revision)
        ? [
            {
              id: revision.id,
              summary: revision.summary,
              at: revision.at,
              by: names.get(revision.author_id) ?? revision.author_id,
            },
          ]
        : [],
    );
  }, [authors, record]);
  const list = useList({
    data: entries,
    sort: { field: "at", order: "DESC" },
    isPending: record === undefined,
  });
  return (
    <ListContextProvider value={list}>
      <RecordTimeline
        messageSource="summary"
        timestampSource="at"
        userSource="by"
      />
    </ListContextProvider>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function PostShow() {
  const { id } = useParams();
  return (
    // Keyed by id: React Router reuses this page between posts, and the page-open
    // diff belongs to one post.
    <ShowLive key={id}>
      <Title title="Post details" />
      <div className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PresenceBar />
          <DualApprovalButton
            required={2}
            pendingValue="in_review"
            approvedValue="published"
          />
        </div>
        {id ? <SimulatedViewer postId={id} /> : null}
        <posts.RecordField label="Title">
          <InPlaceEditor source="title" notifyOnSuccess />
        </posts.RecordField>
        <posts.RecordField source="status" />
        <posts.RecordField source="body" />
        <posts.RecordField label="Author">
          <posts.ReferenceField source="author_id" reference="authors">
            <TextField source="name" />
          </posts.ReferenceField>
        </posts.RecordField>
        <posts.RecordField label="Views">
          <posts.NumberField source="views" />
        </posts.RecordField>
        <posts.RecordField label="Published">
          <posts.BooleanField source="published" />
        </posts.RecordField>
        <Section title="Changes since you opened this page">
          <PostChanges />
        </Section>
        <Section title="Revisions">
          <PostTimeline />
        </Section>
        <Section title="Comments">
          <CommentsThread reference="comments" target="post_id" resolvable />
        </Section>
      </div>
    </ShowLive>
  );
}
