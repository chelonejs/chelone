/**
 * Seed data for the in-memory `fakeDataProvider` — mirrors the shape of the
 * React demo's `apps/demo/src/seed.ts`, trimmed to the `posts` + `authors`
 * vertical the Vue V1 slice ships, plus the `places` the maps add-on shows. `fakeDataProvider(seedData())` builds a
 * fully-working provider (getList / getOne / getMany / create / update /
 * delete) over these records — no server.
 */

/**
 * Records flow into `fakeDataProvider`, which types every row as a
 * `LooseRecord`. The seed shapes are object type aliases rather than
 * interfaces: an alias is implicitly indexable, so it stays assignable to the
 * provider's row type without an open index signature (`seed.test-d.ts` pins
 * it).
 */
export type Author = {
  id: number;
  name: string;
  email: string;
};

export type Post = {
  id: number;
  title: string;
  body: string;
  author_id: number;
  views: number;
  published: boolean;
};

export type Place = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  area: { type: "Polygon"; coordinates: number[][][] };
  route: { type: "LineString"; coordinates: number[][] };
  /** `[west, south, east, north]`. */
  bbox: [number, number, number, number];
};

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

const placeSpots: ReadonlyArray<
  readonly [name: string, address: string, lat: number, lng: number]
> = [
  ["Praça do Comércio", "Praça do Comércio, 1100-148 Lisboa", 38.7075, -9.1364],
  [
    "Castelo de São Jorge",
    "R. de Santa Cruz do Castelo, Lisboa",
    38.7139,
    -9.1335,
  ],
  ["Torre de Belém", "Av. Brasília, 1400-038 Lisboa", 38.6916, -9.216],
  [
    "Mosteiro dos Jerónimos",
    "Praça do Império, 1400-206 Lisboa",
    38.6979,
    -9.2068,
  ],
  [
    "Parque Eduardo VII",
    "Parque Eduardo VII, 1070-051 Lisboa",
    38.7292,
    -9.1536,
  ],
  [
    "Oceanário de Lisboa",
    "Esplanada D. Carlos I, 1990-005 Lisboa",
    38.7634,
    -9.0938,
  ],
  ["Estação do Oriente", "Av. Dom João II, 1990-233 Lisboa", 38.7677, -9.0993],
  ["Jardim da Estrela", "Praça da Estrela, 1200-667 Lisboa", 38.7133, -9.1597],
];

// Every shape hangs off the place's point, so each page shows the map in the
// same city. Longitude spans are wider than latitude's to look square at 38°N.
const places: Place[] = placeSpots.map(([name, address, lat, lng], i) => {
  const dLat = 0.0015;
  const dLng = 0.0019;
  return {
    id: i + 1,
    name,
    address,
    lat,
    lng,
    area: {
      type: "Polygon",
      coordinates: [
        [
          [lng - dLng, lat - dLat],
          [lng + dLng, lat - dLat],
          [lng + dLng, lat + dLat],
          [lng - dLng, lat + dLat],
          [lng - dLng, lat - dLat],
        ],
      ],
    },
    route: {
      type: "LineString",
      coordinates: [
        [lng - dLng * 2, lat - dLat * 2],
        [lng, lat - dLat],
        [lng + dLng * 2, lat + dLat * 2],
      ],
    },
    bbox: [lng - dLng * 3, lat - dLat * 3, lng + dLng * 3, lat + dLat * 3],
  };
});

/** Build a fresh seed object (fakeDataProvider mutates its data in place). */
export function seedData() {
  return {
    posts: structuredClone(posts),
    authors: structuredClone(authors),
    places: structuredClone(places),
  };
}
