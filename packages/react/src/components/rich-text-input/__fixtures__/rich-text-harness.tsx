import {
  createI18n,
  type DataProvider,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  type ResourceRegistry,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { ResourceRegistryProvider } from "../../../resource";

const messages = {
  en: defineMessages({ "chelone.validation.required": "Required" }),
};

type HarnessForm<TFormData> = ReturnType<typeof useForm<TFormData>>;

export interface MountOptions<TFormData> {
  defaultValues?: TFormData;
  onData?: (data: TFormData) => void;
  dataProvider?: DataProvider;
  /** Registers the resources that hooks like `useResourceDefinitions` read. */
  registry?: ResourceRegistry;
}

/**
 * Mounts `ui` under the providers an input needs, with a form holding
 * `defaultValues`. `form()` is the live form, `rerender(ui)` renders a new element in
 * the same tree, and `submit()` runs the form's save.
 */
export function mountUnderForm<TFormData extends object>(
  ui: ReactNode,
  {
    defaultValues,
    onData,
    dataProvider = fakeDataProvider({}),
    registry,
  }: MountOptions<TFormData> = {},
): {
  view: RenderResult;
  form: () => HarnessForm<TFormData>;
  rerender: (next?: ReactNode) => void;
} {
  const i18n = createI18n({ locale: "en", messages });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const live: { form: HarnessForm<TFormData> | null } = { form: null };

  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data): Promise<FieldErrors | undefined> => {
        onData?.(data);
        return undefined;
      },
    });
    live.form = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }

  const tree = (children: ReactNode) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        <FormHost>{children}</FormHost>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
  const view = render(tree(ui));

  function form(): HarnessForm<TFormData> {
    if (live.form === null) throw new Error("The form has not rendered");
    return live.form;
  }

  return {
    view,
    form,
    // A new element, since React skips an element it already rendered.
    rerender: (next: ReactNode = ui) => view.rerender(tree(next)),
  };
}
