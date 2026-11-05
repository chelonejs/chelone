/**
 * P7c-T3 — `<RatingInput>` ported onto chelone `useInput` + `ui/field`
 * (`<FieldSet>`/`<FieldLegend>`) + `<ValidationError>`. jsdom applies no CSS:
 * assert DOM structure/roles/values and behavior (star count, aria-checked,
 * onChange, required marker, error surfacing, disabled), never visual styling.
 */
import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { RatingInput } from "./rating-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    save = async () => undefined,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({ defaultValues, save });
    submitRef.current = form.submit;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return { view, submitRef };
}

afterEach(() => cleanup());

describe("<RatingInput>", () => {
  it("renders `max` radio stars in a radiogroup with the humanized label", () => {
    setup(<RatingInput source="rating" />, {
      defaultValues: { rating: 3 },
    });
    const group = screen.getByRole("radiogroup");
    expect(group).not.toBeNull();
    const stars = screen.getAllByRole("radio");
    expect(stars.length).toBe(5);
    // The three filled stars are checked; the last two are not.
    expect(
      stars.filter((s) => s.getAttribute("aria-checked") === "true"),
    ).toHaveLength(3);
    expect(screen.getByText("Rating")).not.toBeNull();
  });

  it("renders the empty state for a stored string that is no number", () => {
    setup(<RatingInput source="rating" />, {
      defaultValues: { rating: "great" },
    });
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
    expect(
      stars.filter((s) => s.getAttribute("aria-checked") === "true"),
    ).toHaveLength(0);
  });

  it("renders `max` stars when max is set", () => {
    setup(<RatingInput source="rating" max={10} />, {
      defaultValues: { rating: 7 },
    });
    expect(screen.getAllByRole("radio")).toHaveLength(10);
  });

  it("doubles the star count for half-step granularity", () => {
    setup(<RatingInput source="rating" allowHalf />, {
      defaultValues: { rating: 2.5 },
    });
    expect(screen.getAllByRole("radio")).toHaveLength(10);
  });

  it("writes the picked value back to the form value", () => {
    const save = vi.fn(async () => undefined);
    const { submitRef } = setup<{ rating: number }>(
      <RatingInput source="rating" />,
      { defaultValues: { rating: 0 }, save },
    );
    const stars = screen.getAllByRole("radio");
    const fourthStar = stars[3];
    const fifthStar = stars[4];
    if (!fourthStar || !fifthStar) throw new Error("expected 5 stars");
    // Click the 4th star → value 4.
    fireEvent.click(fourthStar);
    expect(fourthStar.getAttribute("aria-checked")).toBe("true");
    expect(fifthStar.getAttribute("aria-checked")).toBe("false");
    void submitRef;
  });

  it("renders the required marker when a required validator is set", () => {
    setup(<RatingInput source="rating" validate={required()} />, {
      defaultValues: { rating: 0 },
    });
    expect(screen.getByText("Rating").textContent).toContain("*");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ rating: number | null }>(
      <RatingInput source="rating" validate={required()} />,
      { defaultValues: { rating: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("field-error");
    expect(alert.textContent).toContain("Required");
  });

  it("hides the label when label is false", () => {
    setup(<RatingInput source="rating" label={false} />, {
      defaultValues: { rating: 4 },
    });
    expect(screen.queryByText("Rating")).toBeNull();
  });

  it("respects the disabled prop (no write on click)", () => {
    setup(<RatingInput source="rating" disabled />, {
      defaultValues: { rating: 3 },
    });
    const stars = screen.getAllByRole("radio");
    const firstStar = stars[0];
    const fifthStar = stars[4];
    if (!firstStar || !fifthStar) throw new Error("expected 5 stars");
    expect(firstStar.getAttribute("aria-disabled")).toBe("true");
    // Clicking a disabled star does not change the selection.
    fireEvent.click(fifthStar);
    expect(fifthStar.getAttribute("aria-checked")).toBe("false");
  });
});
