/**
 * Seed data for the in-memory `fakeDataProvider`. A small retail-style domain:
 * customers place orders for products; posts (with an author FK) show off the
 * ReferenceField wiring and the Zod-schema quickstart resource.
 *
 * `fakeDataProvider(seedData())` builds a fully-working provider (getList /
 * getOne / getMany / create / update / delete) over these records — no server.
 *
 * Every date is an offset from the `now` that `seedData` takes (the current
 * time by default), so calendars, timelines and "x minutes ago" columns stay
 * current however long the dataset has been in the repository.
 */

/**
 * Records flow into `fakeDataProvider`, which types every row as a
 * `LooseRecord`. The seed shapes are object type aliases rather than
 * interfaces: an alias is implicitly indexable, so it stays assignable to the
 * provider's row type without an open index signature (`apps/demo/src/seed.test-d.ts` pins
 * it).
 */
export type Author = {
  id: number;
  name: string;
  email: string;
};

export type PostStatus = "draft" | "in_review" | "published";

export type Revision = {
  id: number;
  at: string;
  author_id: number;
  summary: string;
};

export type Approval = {
  reviewer_id: number;
  at: string;
  decision: "approved" | "changes_requested";
};

export type Post = {
  id: number;
  title: string;
  body: string;
  author_id: number;
  views: number;
  published: boolean;
  status: PostStatus;
  revisions: Revision[];
  approvals: Approval[];
};

export type Variant = {
  sku: string;
  option: string;
  stock: number;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  /** The English name of the root of `category_id`'s chain. */
  category: string;
  category_id: number;
  /** 1 to 5, one decimal. */
  rating: number;
  color: string;
  image: string;
  spec_sheet: string;
  channels: string[];
  shipping_class: string;
  /** Ids of `tags`. */
  tags: number[];
  /** `null` is "not decided yet", not "no". */
  featured: boolean | null;
  url: string;
  variants: Variant[];
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  city: string;
  plan: string;
  /** Percent of the plan's quota, 0 to 100. */
  usage: number;
  phone: string;
  /** `YYYY-MM-DD`. */
  joined_on: string;
  segment: string;
};

export type Order = {
  id: number;
  reference: string;
  customer_id: number;
  product_id: number;
  quantity: number;
  status: string;
  total: number;
  /** ISO datetime, in the past and the future. */
  delivery_at: string;
  slot: string;
  handling_minutes: number;
  /** Ids of `products`; `product_id` is the first. */
  product_ids: number[];
};

export type Place = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  area: { type: "Polygon"; coordinates: number[][][] };
  /** A looser outline around `area`, as a GeoJSON polygon. */
  zone: { type: "Polygon"; coordinates: number[][][] };
  route: { type: "LineString"; coordinates: number[][] };
  /** `[west, south, east, north]`. */
  bbox: [number, number, number, number];
};

export type Locale = "en" | "pt" | "fr";

export type Category = {
  id: number;
  name: Record<Locale, string>;
  /** `null` marks a root. */
  parent_id: number | null;
};

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type Page = {
  id: number;
  title: string;
  slug: string;
  body: string;
  status: "draft" | "published";
  author_id: number;
  parent_id: number | null;
  updated_at: string;
  published_at: string | null;
};

/** The fields `<CommentsThread>` reads, so a post's thread shows these as they are. */
export type Comment = {
  id: number;
  post_id: number;
  authorId: number;
  authorName: string;
  body: string;
  approved: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export type Job = {
  id: number;
  name: string;
  cron: string;
  status: "idle" | "running" | "failed";
  last_run_at: string;
  next_run_at: string;
  duration_ms: number;
};

export type ApiKey = {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  customer_id: number;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
};

export type Webhook = {
  id: number;
  url: string;
  events: string[];
  active: boolean;
  failure_count: number;
  last_delivery_at: string | null;
};

export type ActivityResource =
  | "posts"
  | "orders"
  | "products"
  | "customers"
  | "pages";

export type Activity = {
  id: number;
  actor_id: number;
  resource: ActivityResource;
  record_id: number;
  action: "created" | "updated" | "published" | "commented";
  at: string;
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

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO datetime `offset` ms from `now` (negative is the past). */
function from(now: Date, offset: number): string {
  return new Date(now.getTime() + offset).toISOString();
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

const categoryTree: Category[] = [
  {
    id: 1,
    name: { en: "Electronics", pt: "Eletrónica", fr: "Électronique" },
    parent_id: null,
  },
  { id: 2, name: { en: "Books", pt: "Livros", fr: "Livres" }, parent_id: null },
  { id: 3, name: { en: "Home", pt: "Casa", fr: "Maison" }, parent_id: null },
  {
    id: 4,
    name: { en: "Toys", pt: "Brinquedos", fr: "Jouets" },
    parent_id: null,
  },
  {
    id: 5,
    name: { en: "Apparel", pt: "Vestuário", fr: "Vêtements" },
    parent_id: null,
  },
  {
    id: 6,
    name: { en: "Computers", pt: "Computadores", fr: "Ordinateurs" },
    parent_id: 1,
  },
  { id: 7, name: { en: "Audio", pt: "Áudio", fr: "Audio" }, parent_id: 1 },
  {
    id: 8,
    name: { en: "Peripherals", pt: "Periféricos", fr: "Périphériques" },
    parent_id: 1,
  },
  {
    id: 9,
    name: { en: "Office", pt: "Escritório", fr: "Bureau" },
    parent_id: 3,
  },
  {
    id: 10,
    name: { en: "Monitors", pt: "Monitores", fr: "Moniteurs" },
    parent_id: 6,
  },
  {
    id: 11,
    name: { en: "Storage", pt: "Armazenamento", fr: "Stockage" },
    parent_id: 6,
  },
];

const categories = categoryTree
  .filter((c) => c.parent_id === null)
  .map((c) => c.name.en);

/** The root of `id`'s `parent_id` chain. */
function rootOf(id: number): Category {
  let current = categoryTree.find((c) => c.id === id);
  while (current?.parent_id != null) {
    const parentId: number = current.parent_id;
    current = categoryTree.find((c) => c.id === parentId);
  }
  if (!current) throw new Error(`rootOf: no category ${id}`);
  return current;
}

const tags: Tag[] = [
  { id: 1, name: "new", color: "#2563eb" },
  { id: 2, name: "sale", color: "#dc2626" },
  { id: 3, name: "eco", color: "#16a34a" },
  { id: 4, name: "bestseller", color: "#d97706" },
  { id: 5, name: "limited", color: "#9333ea" },
  { id: 6, name: "bundle", color: "#0891b2" },
  { id: 7, name: "refurbished", color: "#64748b" },
  { id: 8, name: "premium", color: "#111827" },
];

/** The leaf category each product (by position) sits in. */
const productCategoryIds = [8, 6, 9, 7, 8, 10, 9, 9, 8, 9, 8, 11];
const colors = ["black", "white", "silver", "blue", "red", "green"];
const allChannels = ["web", "store", "marketplace", "wholesale"];
const shippingClasses = ["standard", "bulky", "fragile", "express"];
const variantOptions = ["Small", "Medium", "Large"];

const productNames = [
  "Mechanical Keyboard",
  "USB-C Hub",
  "Standing Desk",
  "Noise-Cancelling Headphones",
  "Ergonomic Mouse",
  "4K Monitor",
  "Desk Lamp",
  "Laptop Stand",
  "Webcam 1080p",
  "Cable Organizer",
  "Wrist Rest",
  "Portable SSD",
];

const products: Product[] = productNames.map((name, i) => {
  const sku = `SKU-${String(1000 + i)}`;
  const categoryId = cycle(productCategoryIds, i);
  return {
    id: i + 1,
    name,
    sku,
    price: Math.round((19.99 + i * 12.5) * 100) / 100,
    stock: (i * 7 + 3) % 60,
    category: rootOf(categoryId).name.en,
    category_id: categoryId,
    rating: 3 + ((i * 7) % 20) / 10,
    color: cycle(colors, i),
    image: `https://picsum.photos/seed/chelone-product-${i + 1}/640/480`,
    spec_sheet: `https://example.com/specs/${sku.toLowerCase()}.pdf`,
    channels: allChannels.slice(0, 1 + (i % allChannels.length)),
    shipping_class: cycle(shippingClasses, i),
    tags: [cycle(tags, i).id, cycle(tags, i + 3).id],
    featured: cycle([true, false, null], i),
    url: `https://example.com/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    variants: variantOptions.slice(0, 2 + (i % 2)).map((option, v) => ({
      sku: `${sku}-${option.charAt(0)}`,
      option,
      stock: (i * 5 + v * 11) % 40,
    })),
  };
});

const customerNames = [
  "River Stone",
  "Dana Quill",
  "Sam Rivera",
  "Kai Fischer",
  "Noor Haddad",
  "Toby Meyer",
  "Wren Ellis",
  "Priya Nair",
  "Leo Castro",
  "Mina Park",
];

const cities = ["Portland", "Austin", "Denver", "Seattle", "Chicago", "Boston"];

const plans = ["free", "pro", "team", "enterprise"];
const segments = ["new", "active", "at-risk", "champion"];
const slots = ["morning", "afternoon", "evening"];

const statuses = ["pending", "shipped", "delivered", "cancelled"];

function buildCustomers(now: Date): Customer[] {
  return customerNames.map((name, i) => ({
    id: i + 1,
    name,
    email: `${(name.split(" ")[0] ?? name).toLowerCase()}@example.com`,
    city: cycle(cities, i),
    plan: cycle(plans, i),
    usage: (i * 37 + 12) % 101,
    phone: `+1 555 01${String(10 + i * 7).padStart(2, "0")}`,
    joined_on: from(now, -(30 + i * 45) * DAY).slice(0, 10),
    segment: cycle(segments, i * 3 + (i % 2)),
  }));
}

function buildOrders(now: Date): Order[] {
  return Array.from({ length: 16 }, (_, i) => {
    const product = cycle(products, i);
    const quantity = (i % 4) + 1;
    return {
      id: i + 1,
      reference: `ORD-${String(2001 + i)}`,
      customer_id: (i % customerNames.length) + 1,
      product_id: product.id,
      quantity,
      status: cycle(statuses, i),
      total: Math.round(product.price * quantity * 100) / 100,
      delivery_at: from(now, (i - 6) * DAY + cycle([-3, 2, 7], i) * HOUR),
      slot: cycle(slots, i),
      handling_minutes: 15 + ((i * 10) % 90),
      product_ids: [product.id, cycle(products, i + 1).id],
    };
  });
}

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

/** A closed 12-sided ring around a point, a rough circle for a zone. */
function zoneRing(
  lat: number,
  lng: number,
  rLat: number,
  rLng: number,
): number[][] {
  const ring = Array.from({ length: 12 }, (_, k) => {
    const angle = (k / 12) * 2 * Math.PI;
    return [lng + rLng * Math.cos(angle), lat + rLat * Math.sin(angle)];
  });
  const first = ring[0];
  return first ? [...ring, first] : ring;
}

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
    zone: {
      type: "Polygon",
      coordinates: [zoneRing(lat, lng, dLat * 3.5, dLng * 3.5)],
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

const postTitleStatuses: PostStatus[] = ["draft", "in_review"];

function buildPosts(now: Date): Post[] {
  return postTitles.map((title, i) => {
    const status: PostStatus =
      i % 3 === 0 ? cycle(postTitleStatuses, i / 3) : "published";
    const authorId = cycle(authors, i).id;
    const reviewerId = cycle(authors, i + 2).id;
    const revisionCount = 1 + (i % 3);
    return {
      id: i + 1,
      title,
      body: `Body copy for "${title}". This record lives entirely in the in-memory fakeDataProvider.`,
      author_id: authorId,
      views: 50 + ((i * 137) % 900),
      published: status === "published",
      status,
      revisions: Array.from({ length: revisionCount }, (_, r) => ({
        id: r + 1,
        at: from(now, -(i + 1) * DAY - (revisionCount - r) * 3 * HOUR),
        author_id: r === 0 ? authorId : cycle(authors, i + r).id,
        summary: cycle(
          ["First draft", "Fix typos", "Tighten the intro", "Add references"],
          r,
        ),
      })),
      approvals:
        status === "draft"
          ? []
          : [
              {
                reviewer_id: reviewerId,
                at: from(now, -(i + 1) * DAY + HOUR),
                decision:
                  status === "published" ? "approved" : "changes_requested",
              },
            ],
    };
  });
}

const pageSeeds: ReadonlyArray<
  readonly [title: string, parent: number | null, status: Page["status"]]
> = [
  ["Home", null, "published"],
  ["About", null, "published"],
  ["Team", 2, "published"],
  ["Careers", 2, "draft"],
  ["Support", null, "published"],
  ["Shipping and returns", 5, "published"],
];

function buildPages(now: Date): Page[] {
  return pageSeeds.map(([title, parent, status], i) => ({
    id: i + 1,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    body: `# ${title}\n\nThis page lives in the in-memory data provider.`,
    status,
    author_id: cycle(authors, i).id,
    parent_id: parent,
    updated_at: from(now, -(i * 2 + 1) * DAY),
    published_at: status === "published" ? from(now, -(i * 2 + 5) * DAY) : null,
  }));
}

const commentBodies = [
  "Great read, thank you.",
  "Could you add a reference for the second claim?",
  "This changed how I think about it.",
  "Typo in the third paragraph.",
  "Would love a follow-up on this.",
];

function buildComments(now: Date): Comment[] {
  return Array.from({ length: 20 }, (_, i) => {
    const author = cycle(authors, i + 1);
    return {
      id: i + 1,
      post_id: (i % postTitles.length) + 1,
      authorId: author.id,
      authorName: author.name,
      body: cycle(commentBodies, i),
      approved: i % 4 !== 3,
      createdAt: from(now, -(i * 5 + 1) * HOUR),
      resolvedAt: null,
    };
  });
}

const jobSeeds: ReadonlyArray<
  readonly [name: string, cron: string, status: Job["status"]]
> = [
  ["Rebuild search index", "*/15 * * * *", "idle"],
  ["Send order digests", "0 8 * * *", "idle"],
  ["Sync inventory", "*/5 * * * *", "running"],
  ["Purge expired sessions", "0 3 * * 0", "idle"],
  ["Export analytics", "30 1 * * *", "failed"],
  ["Refresh exchange rates", "0 * * * *", "idle"],
];

function buildJobs(now: Date): Job[] {
  return jobSeeds.map(([name, cron, status], i) => ({
    id: i + 1,
    name,
    cron,
    status,
    last_run_at: from(now, -(i + 1) * 7 * MINUTE),
    next_run_at: from(now, (i + 1) * 11 * MINUTE),
    duration_ms: 800 + i * 1350,
  }));
}

const scopeSets = [["read"], ["read", "write"], ["read", "write", "admin"]];

function buildApiKeys(now: Date): ApiKey[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: cycle(
      ["Storefront", "Mobile app", "Reporting", "CI", "Zapier", "Staging"],
      i,
    ),
    prefix: `ck_live_${String(4000 + i * 137)}`,
    scopes: cycle(scopeSets, i),
    customer_id: (i % customerNames.length) + 1,
    created_at: from(now, -(20 + i * 30) * DAY),
    expires_at: i % 2 === 0 ? from(now, (60 - i * 20) * DAY) : null,
    last_used_at: i === 5 ? null : from(now, -(i + 1) * 3 * HOUR),
  }));
}

const webhookEvents = [
  "order.created",
  "order.shipped",
  "post.published",
  "customer.created",
];

function buildWebhooks(now: Date): Webhook[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    url: `https://hooks.example.com/${cycle(["orders", "shipping", "cms", "crm", "audit"], i)}`,
    events: webhookEvents.slice(i % 3, (i % 3) + 2),
    active: i !== 3,
    failure_count: i === 3 ? 7 : i % 2,
    last_delivery_at: i === 4 ? null : from(now, -(i + 1) * 40 * MINUTE),
  }));
}

const activityResources: ReadonlyArray<{
  resource: ActivityResource;
  size: number;
}> = [
  { resource: "posts", size: postTitles.length },
  { resource: "orders", size: 16 },
  { resource: "products", size: productNames.length },
  { resource: "customers", size: customerNames.length },
  { resource: "pages", size: pageSeeds.length },
];

function buildActivity(now: Date): Activity[] {
  return Array.from({ length: 24 }, (_, i) => {
    const target = cycle(activityResources, i);
    return {
      id: i + 1,
      actor_id: cycle(authors, i).id,
      resource: target.resource,
      record_id: ((i * 5) % target.size) + 1,
      action: cycle(
        ["created", "updated", "published", "commented"],
        i + (i >> 2),
      ),
      at: from(now, -(5 + i * 47) * MINUTE),
    };
  });
}

/**
 * Build a fresh seed object (fakeDataProvider mutates its data in place).
 * `now` anchors every date; pass a fixed one to make a run reproducible.
 */
export function seedData(now: Date = new Date()) {
  return {
    posts: buildPosts(now),
    authors: structuredClone(authors),
    products: structuredClone(products),
    customers: buildCustomers(now),
    orders: buildOrders(now),
    places: structuredClone(places),
    pages: buildPages(now),
    categories: structuredClone(categoryTree),
    tags: structuredClone(tags),
    comments: buildComments(now),
    jobs: buildJobs(now),
    api_keys: buildApiKeys(now),
    webhooks: buildWebhooks(now),
    activity: buildActivity(now),
  };
}

export const categoryChoices = categories.map((c) => ({ id: c, name: c }));
export const statusChoices = statuses.map((s) => ({
  id: s,
  name: s.charAt(0).toUpperCase() + s.slice(1),
}));
