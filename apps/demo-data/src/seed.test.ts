import type { LooseRecord } from "@chelone/core";
import { describe, expect, it } from "vitest";
import {
  channelChoices,
  seedData,
  shippingClassChoices,
  tagChoices,
} from "./seed";

const NOW = new Date("2026-11-06T12:00:00.000Z");

type Seed = ReturnType<typeof seedData>;
type Row = { id: number | string };

type Reference = {
  /** Where the id sits, e.g. `posts#3.author_id`. */
  at: string;
  to: keyof Seed;
  /** The ids found there; `null` is an unset nullable reference. */
  ids: ReadonlyArray<number | null>;
};

/**
 * Every reference the showcase pages follow, written out by hand so a field
 * added to the seed without an entry here is a gap the review sees.
 */
function referencesIn(seed: Seed): Reference[] {
  return [
    ...seed.posts.flatMap((post): Reference[] => [
      {
        at: `posts#${post.id}.author_id`,
        to: "authors",
        ids: [post.author_id],
      },
      {
        at: `posts#${post.id}.revisions[].author_id`,
        to: "authors",
        ids: post.revisions.map((revision) => revision.author_id),
      },
      {
        at: `posts#${post.id}.approvals[].reviewer_id`,
        to: "authors",
        ids: post.approvals.map((approval) => approval.reviewer_id),
      },
      { at: `posts#${post.id}.approvers`, to: "authors", ids: post.approvers },
    ]),
    ...seed.products.flatMap((product): Reference[] => [
      {
        at: `products#${product.id}.category_id`,
        to: "categories",
        ids: [product.category_id],
      },
      { at: `products#${product.id}.tags`, to: "tags", ids: product.tags },
    ]),
    ...seed.orders.flatMap((order): Reference[] => [
      {
        at: `orders#${order.id}.customer_id`,
        to: "customers",
        ids: [order.customer_id],
      },
      {
        at: `orders#${order.id}.product_id`,
        to: "products",
        ids: [order.product_id],
      },
      {
        at: `orders#${order.id}.product_ids`,
        to: "products",
        ids: order.product_ids,
      },
    ]),
    ...seed.categories.map(
      (category): Reference => ({
        at: `categories#${category.id}.parent_id`,
        to: "categories",
        ids: [category.parent_id],
      }),
    ),
    ...seed.pages.flatMap((page): Reference[] => [
      {
        at: `pages#${page.id}.author_id`,
        to: "authors",
        ids: [page.author_id],
      },
      { at: `pages#${page.id}.parent_id`, to: "pages", ids: [page.parent_id] },
    ]),
    ...seed.comments.flatMap((comment): Reference[] => [
      {
        at: `comments#${comment.id}.post_id`,
        to: "posts",
        ids: [comment.post_id],
      },
      {
        at: `comments#${comment.id}.authorId`,
        to: "authors",
        ids: [comment.authorId],
      },
    ]),
    ...seed.api_keys.map(
      (key): Reference => ({
        at: `api_keys#${key.id}.customer_id`,
        to: "customers",
        ids: [key.customer_id],
      }),
    ),
    ...seed.activity.map(
      (entry): Reference => ({
        at: `activity#${entry.id}.actor_id`,
        to: "authors",
        ids: [entry.actor_id],
      }),
    ),
  ];
}

function idsOf(rows: ReadonlyArray<Row>): Set<number | string> {
  return new Set(rows.map((row) => row.id));
}

describe("seedData", () => {
  const seed = seedData(NOW);

  it("gives every resource the showcase pages read at least a few records", () => {
    for (const name of [
      "products",
      "customers",
      "orders",
      "posts",
      "places",
      "pages",
      "categories",
      "tags",
      "comments",
      "jobs",
      "api_keys",
      "webhooks",
      "activity",
    ] as const) {
      expect(seed[name].length, name).toBeGreaterThanOrEqual(5);
    }
  });

  it("leaves an in_review post one approval short of two, so the signed-in user's approval publishes it", () => {
    const inReview = seed.posts.filter((post) => post.status === "in_review");
    expect(inReview.some((post) => post.approvers.length === 1)).toBe(true);
    expect(inReview.some((post) => post.approvers.length === 0)).toBe(true);
  });

  it("keeps ids unique within each resource", () => {
    for (const [name, rows] of Object.entries(seed)) {
      const ids = rows.map((row) => row.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it("points every reference id at a record", () => {
    const references = referencesIn(seed);
    expect(references.length).toBeGreaterThan(100);
    for (const { at, to, ids } of references) {
      const targets = idsOf(seed[to]);
      for (const id of ids) {
        if (id === null) continue;
        expect(targets.has(id), `${at} = ${id} is not in ${to}`).toBe(true);
      }
    }
  });

  it("lists an order's product_id among its product_ids", () => {
    for (const order of seed.orders) {
      expect(order.product_ids, `orders#${order.id}`).toContain(
        order.product_id,
      );
    }
  });

  it("gives every order a delivery slot time and an ISO handling duration", () => {
    for (const order of seed.orders) {
      expect(order.slot, `orders#${order.id}.slot`).toMatch(
        /^([01]\d|2[0-3]):[0-5]\d$/,
      );
      expect(order.handling, `orders#${order.id}.handling`).toMatch(
        /^PT(\d+H)?\d+M$/,
      );
    }
  });

  it("keeps every row assignable to the data provider's LooseRecord", () => {
    const rows: LooseRecord[] = Object.values(seed).flat();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("points every activity entry at the record it names", () => {
    for (const entry of seed.activity) {
      const rows: ReadonlyArray<Row> | undefined = Object.entries(seed).find(
        ([name]) => name === entry.resource,
      )?.[1];
      expect(rows, `activity#${entry.id}.resource`).toBeDefined();
      expect(
        idsOf(rows ?? []).has(entry.record_id),
        `activity#${entry.id} ${entry.resource}#${entry.record_id}`,
      ).toBe(true);
    }
  });

  it("ends every category_id chain at a root", () => {
    const parents = new Map(seed.categories.map((c) => [c.id, c.parent_id]));
    for (const product of seed.products) {
      const seen = new Set<number>();
      let current: number | null = product.category_id;
      while (current !== null) {
        expect(seen.has(current), `cycle at category ${current}`).toBe(false);
        seen.add(current);
        const parent = parents.get(current);
        expect(parent, `category ${current}`).not.toBeUndefined();
        current = parent ?? null;
      }
      expect(seen.size, `product#${product.id}`).toBeGreaterThan(0);
    }
  });

  it("has a root category with children, and names every category in each locale", () => {
    const roots = seed.categories.filter((c) => c.parent_id === null);
    expect(roots.length).toBeGreaterThan(1);
    expect(
      seed.categories.some((c) => c.parent_id !== null),
      "a nested category",
    ).toBe(true);
    for (const category of seed.categories) {
      for (const locale of ["en", "pt", "fr"] as const) {
        expect(
          category.name[locale].length,
          `category#${category.id}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("leaves some products unfeatured, some featured and some undecided", () => {
    const values = new Set(seed.products.map((p) => p.featured));
    expect(values).toEqual(new Set([true, false, null]));
  });

  it("offers a choice for every channel, shipping class and tag a product holds", () => {
    const channels = new Set(channelChoices.map((c) => c.id));
    const shipping = new Set(shippingClassChoices.map((c) => c.id));
    const tagIds = new Set(tagChoices.map((c) => c.id));
    for (const product of seed.products) {
      for (const channel of product.channels)
        expect(channels).toContain(channel);
      expect(shipping).toContain(product.shipping_class);
      for (const tag of product.tags) expect(tagIds).toContain(tag);
    }
  });

  it("gives every product a hex colour", () => {
    for (const product of seed.products) {
      expect(product.color, product.name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives every product keywords as text", () => {
    for (const product of seed.products) {
      expect(product.keywords.length, product.name).toBeGreaterThan(0);
      for (const keyword of product.keywords)
        expect(keyword.length).toBeGreaterThan(0);
    }
  });

  it("gives places a GeoJSON zone", () => {
    for (const place of seed.places) {
      expect(place.zone.type).toBe("Polygon");
      const ring = place.zone.coordinates[0] ?? [];
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  describe("dates relative to now", () => {
    const DAY = 24 * 60 * 60 * 1000;

    it("moves every date with `now`", () => {
      const later = seedData(new Date(NOW.getTime() + 30 * DAY));
      const pairs: ReadonlyArray<[number, number]> = [
        [
          Date.parse(seed.orders[0]?.delivery_at ?? ""),
          Date.parse(later.orders[0]?.delivery_at ?? ""),
        ],
        [
          Date.parse(seed.customers[0]?.joined_on ?? ""),
          Date.parse(later.customers[0]?.joined_on ?? ""),
        ],
        [
          Date.parse(seed.jobs[0]?.next_run_at ?? ""),
          Date.parse(later.jobs[0]?.next_run_at ?? ""),
        ],
        [
          Date.parse(seed.activity[0]?.at ?? ""),
          Date.parse(later.activity[0]?.at ?? ""),
        ],
        [
          Date.parse(seed.posts[0]?.revisions[0]?.at ?? ""),
          Date.parse(later.posts[0]?.revisions[0]?.at ?? ""),
        ],
      ];
      for (const [before, after] of pairs) {
        expect(after - before).toBe(30 * DAY);
      }
    });

    it("puts deliveries on both sides of now so a calendar has past and upcoming", () => {
      const times = seed.orders.map((o) => Date.parse(o.delivery_at));
      expect(times.some((t) => t < NOW.getTime())).toBe(true);
      expect(times.some((t) => t > NOW.getTime())).toBe(true);
    });

    it("never dates activity or revisions after now", () => {
      for (const entry of seed.activity) {
        expect(Date.parse(entry.at)).toBeLessThanOrEqual(NOW.getTime());
      }
      for (const post of seed.posts) {
        for (const revision of post.revisions) {
          expect(Date.parse(revision.at)).toBeLessThanOrEqual(NOW.getTime());
        }
      }
    });
  });

  it("hands out a fresh object each call, since the data provider mutates in place", () => {
    const first = seedData(NOW);
    const second = seedData(NOW);
    first.products.length = 0;
    expect(second.products.length).toBeGreaterThan(0);
  });
});
