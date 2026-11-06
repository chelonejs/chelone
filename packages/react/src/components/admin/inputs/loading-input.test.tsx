import { elementOf } from "@chelone/test-utils";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingInput } from "./loading-input";

describe("LoadingInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("LoadingInput renders a disabled, busy, read-only input with its label tied to it", () => {
    render(<LoadingInput label="Title" />);

    const input = elementOf(screen.getByLabelText("Title"), HTMLInputElement);
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe("");
    expect(input.getAttribute("aria-busy")).toBe("true");
  });

  it("LoadingInput shows no spinner before the timeout and one after it", () => {
    render(<LoadingInput label="Title" />);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryByRole("status")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("LoadingInput timeout prop changes when the spinner appears", () => {
    render(<LoadingInput label="Title" timeout={200} />);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(screen.queryByRole("status")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("LoadingInput renders the helper text and omits the label when none is given", () => {
    const { container } = render(
      <LoadingInput helperText="Loading the title" />,
    );

    expect(screen.getByText("Loading the title")).toBeTruthy();
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector("fieldset")).not.toBeNull();
  });
});
