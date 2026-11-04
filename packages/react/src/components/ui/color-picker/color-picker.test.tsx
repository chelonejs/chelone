import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./color-picker";

function openPicker(onChange: (value: string) => void) {
  render(<ColorPicker value="#000000" mode="hex" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Pick a color" }));
}

describe("ColorPicker eyedropper", () => {
  beforeEach(() => {
    // jsdom has no canvas; the L×C pad bails out when there is no context.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("the eyedropper button sets the picked colour", async () => {
    vi.stubGlobal(
      "EyeDropper",
      class {
        open() {
          return Promise.resolve({ sRGBHex: "#ff0000" });
        }
      },
    );
    const onChange = vi.fn();
    openPicker(onChange);

    fireEvent.click(
      await screen.findByRole("button", { name: "Pick color from screen" }),
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("#ff0000"));
  });

  it("the eyedropper button is absent without window.EyeDropper", async () => {
    openPicker(vi.fn());

    await screen.findByRole("dialog");
    expect(
      screen.queryByRole("button", { name: "Pick color from screen" }),
    ).toBeNull();
  });

  it("a cancelled eyedropper pick leaves the colour alone", async () => {
    const open = vi.fn(() => Promise.reject(new Error("cancelled")));
    vi.stubGlobal(
      "EyeDropper",
      class {
        open = open;
      },
    );
    const onChange = vi.fn();
    openPicker(onChange);

    fireEvent.click(
      await screen.findByRole("button", { name: "Pick color from screen" }),
    );

    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });
});
