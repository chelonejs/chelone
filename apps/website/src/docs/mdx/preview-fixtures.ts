/**
 * The fixture data + services every live `<ComponentPreview>` shares.
 *
 * A trimmed, self-contained copy of the reference demo's seed (posts + their
 * author FK) so the docs bundle never reaches across into `apps/demo`. Each demo
 * renders against a fresh `fakeDataProvider(previewSeed())` under
 * `<PreviewProvider>` (see preview-provider.tsx) — the same in-memory,
 * no-server stack the reference app uses, which is what proves the ported
 * `@chelone/react` components resolve + render at runtime.
 */
import {
  createI18n,
  createNotificationStore,
  createStore,
  defaultMessages,
  defineMessages,
  defineResources,
  englishMessages,
} from "@chelone/core";
import { z } from "zod";

// ── Records ──────────────────────────────────────────────────────────────────

export type PreviewAuthor = {
  id: number;
  name: string;
  email: string;
};
export type PreviewPost = {
  id: number;
  title: string;
  body: string;
  author_id: number;
  views: number;
  published: boolean;
  status: "draft" | "review" | "published";
  /** ISO datetime inside the current month, for the calendar demo. */
  publish_at: string;
  /** Ids of the authors who approved the post; `<DualApprovalButton>` writes it. */
  approvers: number[];
  revisions: PreviewRevision[];
};
export type PreviewRevision = {
  id: number;
  at: string;
  author_id: number;
  summary: string;
};
export type PreviewComment = {
  id: number;
  post_id: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
  resolvedAt: string | null;
};

const authors: PreviewAuthor[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  { id: 2, name: "Alan Turing", email: "alan@example.com" },
  { id: 3, name: "Grace Hopper", email: "grace@example.com" },
];

const postTitles = [
  "On Computable Numbers",
  "Notes on the Analytical Engine",
  "The Genesis of the Compiler",
  "Trajectory Calculations by Hand",
  "A Note on Recursion",
  "Programming the Mark I",
  "The Imitation Game Revisited",
  "Debugging a Moth",
  "Machine Intelligence and Chess",
  "Lady Lovelace's Objection",
  "The Entscheidungsproblem",
  "COBOL for Everyone",
  "Morphogenesis in Practice",
  "Subroutines and Libraries",
  "The Bombe, Explained",
  "Nanoseconds on a Wire",
  "Notes on Bernoulli Numbers",
  "Computing Machinery and Thought",
  "Naval Firing Tables",
  "The Chemical Basis of Patterns",
  "A-0 and the First Linker",
  "Weaving Numbers into Cards",
  "Pilot ACE Design Notes",
  "Standard Languages for Business",
  "Punched Card Programming",
  "Analytical Engine Mechanisms",
  "Halting Problems in Plain Words",
  "Teaching Machines to Teach",
  "Early Software Engineering Habits",
  "Turing Machines Made Concrete",
];

const HOUR = 3_600_000;
const hoursAgo = (hours: number) =>
  new Date(Date.UTC(2026, 0, 15, 12) - hours * HOUR).toISOString();

const revisionSummaries = ["First draft", "Fix typos", "Tighten the intro"];

const postStatuses = ["draft", "review", "published"] as const;
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

/** Post 2 is in review and already has Alan's approval. */
const posts: PreviewPost[] = postTitles.map((title, i) => ({
  id: i + 1,
  title,
  body: `Body copy for "${title}". This record lives entirely in the in-memory fakeDataProvider.`,
  author_id: authors[i % authors.length].id,
  views: 50 + ((i * 137) % 900),
  published: i % 3 !== 0,
  status: postStatuses[i % postStatuses.length],
  publish_at: new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 + ((i * 5) % 28),
    9 + (i % 8),
  ).toISOString(),
  approvers: i === 1 ? [2] : [],
  revisions: revisionSummaries.map((summary, r) => ({
    id: r + 1,
    at: hoursAgo((revisionSummaries.length - r) * 20 + i),
    author_id: authors[(i + r) % authors.length].id,
    summary,
  })),
}));

const comments: PreviewComment[] = [
  {
    id: 1,
    post_id: 1,
    authorId: 2,
    authorName: "Alan Turing",
    body: "The second section needs a source.",
    createdAt: hoursAgo(5),
    resolvedAt: null,
  },
  {
    id: 2,
    post_id: 1,
    authorId: 3,
    authorName: "Grace Hopper",
    body: "Fixed the typo in the intro.",
    createdAt: hoursAgo(2),
    resolvedAt: hoursAgo(1),
  },
];

/** Build a fresh seed object (fakeDataProvider mutates its data in place). */
export function previewSeed() {
  return {
    posts: structuredClone(posts),
    authors: structuredClone(authors),
    comments: structuredClone(comments),
  };
}

/** The first seeded post — the ambient record for field/input previews. */
export const previewRecord: PreviewPost = structuredClone(posts[0]);

export { previewPlace } from "./preview-place";

// ── The Zod resource registry (drives the quickstart's auto-validation) ──────

export const postSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().min(1, "Body is required"),
  author_id: z.number({ message: "Pick an author" }),
  views: z.number().min(0).optional(),
  published: z.boolean().optional(),
});

export const previewResources = defineResources({
  posts: { schema: postSchema },
});

// ── Services ─────────────────────────────────────────────────────────────────

// A minimal English catalog so the ported `ra.*`-keyed components read as
// English (chelone i18n never throws on a missing key — it echoes the key).
const en = defineMessages({
  ...defaultMessages,
  "ra.action.edit": "Edit",
  "ra.action.create": "Create",
  "ra.action.save": "Save",
  "ra.action.cancel": "Cancel",
  "ra.action.delete": "Delete",
  "ra.action.show": "Show",
  "ra.action.sort": "Sort",
  "ra.action.search": "Search",
  "ra.action.export": "Export",
  "ra.boolean.true": "Yes",
  "ra.boolean.false": "No",
  "ra.boolean.null": " ",
  "ra.page.list": "{name}",
  "ra.page.create": "Create {name}",
  "ra.page.edit": "{name} {recordRepresentation}",
  "ra.page.show": "{name} {recordRepresentation}",
  "ra.navigation.no_results": "No {name} found",
  "ra.navigation.page_range_info": "{offsetBegin}-{offsetEnd} of {total}",
  "ra.navigation.page_rows_per_page": "Rows per page:",
  // The drop-zone prompts of `<FileInput>` and `<ImageInput>`.
  "ra.input.file.upload_several":
    englishMessages["ra.input.file.upload_several"],
  "ra.input.file.upload_single": englishMessages["ra.input.file.upload_single"],
  "ra.input.image.upload_several":
    englishMessages["ra.input.image.upload_several"],
  "ra.input.image.upload_single":
    englishMessages["ra.input.image.upload_single"],
  // The screens `<AccessDenied>`, `<AuthenticationError>` and `<AuthError>` show.
  "ra.page.access_denied": englishMessages["ra.page.access_denied"],
  "ra.page.authentication_error":
    englishMessages["ra.page.authentication_error"],
  "ra.page.error": englishMessages["ra.page.error"],
  "ra.message.access_denied": englishMessages["ra.message.access_denied"],
  "ra.message.auth_error": englishMessages["ra.message.auth_error"],
  "ra.message.authentication_error":
    englishMessages["ra.message.authentication_error"],
});

export function makePreviewI18n() {
  return createI18n({ locale: "en", messages: { en }, fallbackLocale: "en" });
}

export function makePreviewNotifications() {
  return createNotificationStore();
}

export function makePreviewStore() {
  return createStore();
}
