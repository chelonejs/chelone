import { useIsFetching } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
