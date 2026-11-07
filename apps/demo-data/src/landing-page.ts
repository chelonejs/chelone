import type { BlockDocNode } from "@chelone/core";

const text = (value: string): BlockDocNode => ({ type: "text", text: value });

const heading = (level: 1 | 2, value: string): BlockDocNode => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

const paragraph = (value: string): BlockDocNode => ({
  type: "paragraph",
  content: [text(value)],
});

/**
 * The shop's landing page as a block document: copy, a callout, a chart of
 * orders, a chart of the catalogue and a list of products. The chart and list
 * blocks hold no data, only the resource they read, so the page shows the shop
 * as it stands.
 */
export function landingPageDocument(): BlockDocNode {
  return {
    type: "doc",
    content: [
      heading(1, "Everything for the workshop"),
      paragraph(
        "Tools, timber and trimmings, packed by the people who use them.",
      ),
      {
        type: "callout",
        attrs: { variant: "success" },
        content: [paragraph("Free shipping on orders over $50 this month.")],
      },
      heading(2, "Orders by status"),
      {
        type: "chart",
        attrs: {
          resource: "orders",
          type: "bar",
          category: "status",
          value: "total",
          aggregate: "sum",
        },
      },
      heading(2, "Units in stock"),
      {
        type: "chart",
        attrs: {
          resource: "products",
          type: "bar",
          category: "category",
          value: "stock",
          aggregate: "sum",
        },
      },
      heading(2, "Customer favourites"),
      {
        type: "recordList",
        attrs: {
          resource: "products",
          perPage: 5,
          fields: ["name", "category", "price"],
        },
      },
    ],
  };
}
