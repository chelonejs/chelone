import { useIsFetching } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { type PreviewMode, PreviewProvider } from "./preview-provider";

const demos = import.meta.glob<{
  default: () => ReactNode;
  mode?: PreviewMode;
}>("../content/**/demos/*.tsx");

function DemoContent({ children }: { children: ReactNode }) {
  const fetching = useIsFetching();
  return (
    <div data-testid="demo" aria-busy={fetching > 0}>
      {children}
    </div>
  );
}

// The maps demos geocode through Nominatim. A test must not reach the network:
// a slow answer left the demo busy past `waitFor`'s timeout on CI.
beforeEach(() => {
  vi.stubGlobal("fetch", async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== "nominatim.openstreetmap.org") {
      throw new Error(`a demo requested ${url.origin}`);
    }
    return Response.json({
      display_name: "Rua Augusta, Lisboa, Portugal",
      lat: "38.7075",
      lon: "-9.1364",
    });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(Object.entries(demos))(
  "%s mounts with content and no console error",
  async (_path, load) => {
    const errorSpy = vi.spyOn(console, "error");
    const { default: Demo, mode } = await load();
    render(
      <MemoryRouter initialEntries={["/docs/preview"]}>
        <PreviewProvider mode={mode}>
          <DemoContent>
            <Demo />
          </DemoContent>
        </PreviewProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const content = screen.getByTestId("demo");
      expect(content.getAttribute("aria-busy")).toBe("false");
      expect(content.innerHTML.trim()).not.toBe("");
    });
    cleanup();
    expect(errorSpy).not.toHaveBeenCalled();
  },
);
