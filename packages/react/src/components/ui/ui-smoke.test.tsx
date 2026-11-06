/**
 * P7b-T1 smoke test for the verbatim shadcn `ui/` foundation.
 *
 * The `ui/` primitives are copy-verbatim shadcn (new-york style) — they carry
 * NO admin logic, so this is a mount-and-render smoke test, not full TDD: it
 * proves the copied tree resolves (the `@/` alias, `cn`, radix-ui, the deps),
 * compiles, and renders real DOM under jsdom. jsdom applies no CSS, so we
 * assert structure/roles/attributes/behavior — never visual styling.
 *
 * Imports go through the `@/` alias (not relative paths) to exercise the same
 * resolve wiring registry/consumers use. Assertions use native DOM APIs + plain
 * vitest matchers (no `@testing-library/jest-dom`) to match the package's
 * existing test convention.
 */
import { elementOf } from "@chelone/test-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("ui/ foundation smoke", () => {
  it("renders Button as a real <button> carrying its slot marker", () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("data-slot")).toBe("button");
  });

  it("renders Input as a real <input> with the passed props", () => {
    render(<Input placeholder="Title" defaultValue="hello" />);
    const input = elementOf(
      screen.getByPlaceholderText("Title"),
      HTMLInputElement,
    );
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("data-slot")).toBe("input");
    expect(input.value).toBe("hello");
  });

  it("renders Checkbox with the checkbox role", () => {
    render(<Checkbox aria-label="agree" />);
    const box = screen.getByRole("checkbox", { name: "agree" });
    expect(box.getAttribute("data-slot")).toBe("checkbox");
  });

  it("renders the Field group with a label and an error message", () => {
    render(
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input id="name" />
        <FieldError errors={[{ message: "Required" }]} />
      </Field>,
    );
    // Field is role="group" with the field slot marker.
    expect(screen.getByRole("group").getAttribute("data-slot")).toBe("field");
    // Label is a real <label>.
    expect(screen.getByText("Name").tagName).toBe("LABEL");
    // FieldError renders its single message in a role="alert" container.
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("field-error");
    expect(alert.textContent).toContain("Required");
  });

  it("renders a Select trigger (radix combobox) with the placeholder", () => {
    render(
      <Select>
        <SelectTrigger aria-label="fruit">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "fruit" });
    expect(trigger.getAttribute("data-slot")).toBe("select-trigger");
    expect(trigger.textContent).toContain("Pick one");
  });

  it("focuses the InputGroup input on an addon click that is not on a button", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="amount" />
        <InputGroupAddon>
          <span>USD</span>
          <InputGroupButton>Clear</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const input = screen.getByRole("textbox", { name: "amount" });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(document.activeElement).not.toBe(input);

    fireEvent.click(screen.getByText("USD"));
    expect(document.activeElement).toBe(input);
  });
});
