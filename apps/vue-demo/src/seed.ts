/**
 * Seed data for the in-memory `fakeDataProvider` — mirrors the shape of the
 * React demo's `apps/demo/src/seed.ts`, trimmed to the `posts` + `authors`
 * vertical the Vue V1 slice ships. `fakeDataProvider(seedData())` builds a
 * fully-working provider (getList / getOne / getMany / create / update /
 * delete) over these records — no server.
 */

/**
 * Records flow into `fakeDataProvider`, which types every row as a `LooseRecord`
 * (`ResourceRecord & { [key: string]: unknown }`). The seed interfaces carry the
 * same open index signature so the concrete shapes stay assignable to the
 * provider's row type while keeping their known fields typed.
 */
export interface Author {
  id: number;
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  author_id: number;
  views: number;
  published: boolean;
  [key: string]: unknown;
}

/**
 * Pick element `i % arr.length` with a defined return type (satisfies
 * `noUncheckedIndexedAccess` without a non-null assertion). Throws only on an
 * empty array — impossible for the literal arrays below.
 */
function cycle<T>(arr: readonly T[], i: number): T {
  const value = arr[i % arr.length];
  if (value === undefined) throw new Error("cycle: empty array");
  return value;
}

const authors: Author[] = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com" },
  { id: 2, name: "Alan Turing", email: "alan@example.com" },
  { id: 3, name: "Grace Hopper", email: "grace@example.com" },
  { id: 4, name: "Katherine Johnson", email: "katherine@example.com" },
  { id: 5, name: "Margaret Hamilton", email: "margaret@example.com" },
];

const postTitles = [
  "Analytical Engines Explained",
  "On Computable Numbers",
  "The First Compiler",
  "Orbital Mechanics for Everyone",
  "Software Engineering at NASA",
  "Notes on the Bernoulli Numbers",
  "Breaking the Enigma",
  "COBOL Considered Useful",
  "Trajectory Calculations by Hand",
  "Apollo Guidance Computer Internals",
  "A Note on Recursion",
  "Debugging the Mark II",
];

const posts: Post[] = postTitles.map((title, i) => ({
  id: i + 1,
  title,
  body: `Body copy for "${title}". This record lives entirely in the in-memory fakeDataProvider.`,
  author_id: cycle(authors, i).id,
  views: 50 + ((i * 137) % 900),
  published: i % 3 !== 0,
}));

/** Build a fresh seed object (fakeDataProvider mutates its data in place). */
export function seedData() {
  return {
    posts: structuredClone(posts),
    authors: structuredClone(authors),
  };
}
