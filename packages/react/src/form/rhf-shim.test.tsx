import {
  createArraySourceScope,
  createFormController,
  type FieldErrors,
  rootSourceScope,
} from "@chelone/core";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneFormProvider, SourceContextProvider } from "../form-context";
import { useInput } from "../form-hooks";
import {
  useController as ShimController,
  useFormContext as ShimFormContext,
  FormProvider as ShimFormProvider,
  useWatch,
} from "./rhf-shim";

afterEach(() => {
  cleanup();
});

interface Values {
  q: string;
  nested: { child: string };
}

/** A live chelone form hosting shim consumers under a CheloneFormProvider. */
function makeHost(defaultValues: Values) {
  const controller = createFormController<Values>({
    defaultValues,
    save: async () => undefined as FieldErrors | undefined,
  });
  controller.form.mount();
  function Host({ children }: { children: ReactNode }) {
    return (
      <CheloneFormProvider form={controller.form} submit={controller.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return { controller, Host };
}

describe("useWatch (RHF shim over the ambient chelone form)", () => {
  it("reads the live value at `name` from the ambient form", () => {
    const { controller, Host } = makeHost({
      q: "hello",
      nested: { child: "x" },
    });
    function Reader() {
      const value = useWatch({ name: "q" });
      return <span data-testid="v">{String(value)}</span>;
    }
    const { getByTestId } = render(
      <Host>
        <Reader />
      </Host>,
    );
    expect(getByTestId("v").textContent).toBe("hello");
    act(() => {
      controller.form.setFieldValue("q", "world");
    });
    expect(getByTestId("v").textContent).toBe("world");
  });

  it("reads a nested path", () => {
    const { controller, Host } = makeHost({
      q: "a",
      nested: { child: "deep" },
    });
    function Reader() {
      const value = useWatch({ name: "nested.child" });
      return <span data-testid="v">{String(value)}</span>;
    }
    const { getByTestId } = render(
      <Host>
        <Reader />
      </Host>,
    );
    expect(getByTestId("v").textContent).toBe("deep");
    act(() => {
      controller.form.setFieldValue("nested.child", "changed");
    });
    expect(getByTestId("v").textContent).toBe("changed");
  });

  it("respects the ambient source scope (iterator-row prefixing)", () => {
    const { controller, Host } = makeHost({
      q: "root",
      nested: { child: "n" },
    });
    // An array/group scope maps a relative name onto an absolute path.
    const scope = createArraySourceScope(rootSourceScope, "nested");
    function Reader() {
      // Relative name "child" resolves to "nested.child" under the scope.
      const value = useWatch({ name: "child" });
      return <span data-testid="v">{String(value)}</span>;
    }
    const { getByTestId } = render(
      <Host>
        <SourceContextProvider scope={scope}>
          <Reader />
        </SourceContextProvider>
      </Host>,
    );
    expect(getByTestId("v").textContent).toBe("n");
    act(() => {
      controller.form.setFieldValue("nested.child", "scoped");
    });
    expect(getByTestId("v").textContent).toBe("scoped");
  });

  it("only re-renders the watcher when ITS field changes, not siblings", () => {
    const { controller, Host } = makeHost({
      q: "a",
      nested: { child: "b" },
    });
    let renders = 0;
    function Reader() {
      renders += 1;
      const value = useWatch({ name: "q" });
      return <span data-testid="v">{String(value)}</span>;
    }
    render(
      <Host>
        <Reader />
      </Host>,
    );
    const before = renders;
    // Mutate a DIFFERENT field — the watcher must not re-render.
    act(() => {
      controller.form.setFieldValue("nested.child", "c");
    });
    expect(renders).toBe(before);
    // Mutate ITS field — it must re-render.
    act(() => {
      controller.form.setFieldValue("q", "z");
    });
    expect(renders).toBe(before + 1);
  });
});

describe("rhf-shim re-exports (documented mappings)", () => {
  it("re-exports CheloneFormProvider as the RHF FormProvider analog", () => {
    expect(ShimFormProvider).toBe(CheloneFormProvider);
  });

  it("re-exports useCheloneFormContext as the RHF useFormContext analog", () => {
    // A consumer using the shim's context hook reads the same ambient form.
    const { controller, Host } = makeHost({
      q: "ctx",
      nested: { child: "n" },
    });
    let seen: unknown;
    function Reader() {
      const ctx = ShimFormContext();
      seen = ctx.form;
      return null;
    }
    render(
      <Host>
        <Reader />
      </Host>,
    );
    expect(seen).toBe(controller.form);
  });

  it("re-exports useInput as the Controller/useController analog", () => {
    expect(ShimController).toBe(useInput);
  });
});
