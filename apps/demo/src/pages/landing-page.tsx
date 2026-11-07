/**
 * The Landing page: the shop's storefront page as one block document, edited
 * on the left and previewed read-only on the right as it is typed. The
 * document holds copy, a callout, two charts and a record list; the charts and
 * the list read the shop's `orders` and `products` when they render.
 */

import type { BlockDocNode } from "@chelone/core";
import { landingPageDocument } from "@chelone/demo-data";
import { CheloneFormProvider, useForm, useWatch } from "@chelone/react";
import {
  BlockDocField,
  BlockEditorInput,
  dataBlocks,
  defaultBlocks,
} from "@chelone/react/block-editor";

export const title = "Landing page";
export const group = "Content";

const blocks = [...defaultBlocks, ...dataBlocks];

interface LandingValues {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

function Preview() {
  const body = useWatch<BlockDocNode | null>({ name: "body" });
  return (
    <BlockDocField
      source="body"
      record={{ id: 1, body }}
      blocks={blocks}
      empty="Nothing to preview yet"
      className="rounded-md border p-3"
    />
  );
}

export default function LandingPage() {
  const { form, submit } = useForm<LandingValues>({
    defaultValues: { body: landingPageDocument() },
    save: async () => undefined,
  });
  return (
    <CheloneFormProvider form={form} submit={submit}>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-label="Landing page editor" className="min-w-0">
          <BlockEditorInput
            source="body"
            label="Landing page"
            blocks={blocks}
            helperText="Type / on an empty line to insert a block."
          />
        </section>
        <section aria-label="Landing page preview" className="min-w-0">
          <h2 className="mb-2 font-medium text-sm">Preview</h2>
          <Preview />
        </section>
      </div>
    </CheloneFormProvider>
  );
}
