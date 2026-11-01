import {
  defineResources,
  fakeDataProvider,
  type ResourceMap,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "../../../context";
import { useGuessedResource } from "./use-guessed-resource";

afterEach(cleanup);

function Probe({ resource }: { resource: string }) {
  const described = useGuessedResource(resource);
  const fields = described?.fields.map(
    (field) => `${field.source}:${field.kind}`,
  );
  return (
    <output data-testid="described">{fields?.join(",") ?? "undefined"}</output>
  );
}

function renderProbe(resource: string, resources?: ResourceMap) {
  render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      resources={resources}
    >
      <Probe resource={resource} />
    </CheloneProvider>,
  );
  return screen.getByTestId("described").textContent;
}

describe("useGuessedResource", () => {
  it("describes the registered schema of the resource", () => {
    const resources = defineResources({
      posts: {
        schema: z.object({ id: z.string(), title: z.string(), n: z.number() }),
      },
    });
    expect(renderProbe("posts", resources)).toBe("id:text,title:text,n:number");
  });

  it("returns undefined for a resource without a schema", () => {
    const resources = defineResources({
      posts: { schema: z.object({ id: z.string() }) },
      tags: {},
    });
    expect(renderProbe("tags", resources)).toBe("undefined");
    cleanup();
    expect(renderProbe("comments", resources)).toBe("undefined");
  });

  it("returns undefined when the provider has no resources registry", () => {
    expect(renderProbe("posts")).toBe("undefined");
  });
});
