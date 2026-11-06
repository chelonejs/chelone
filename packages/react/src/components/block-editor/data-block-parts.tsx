import type { BlockSpec } from "@chelone/core";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslate } from "../../i18n-hooks";
import { useResourceDefinitions } from "../../resource";

/** The attrs a block spec's schema outputs. */
export type AttrsOf<S extends BlockSpec> =
  S extends BlockSpec<infer A> ? A : never;

const boxClass = "my-2 rounded-md border border-dashed p-6 text-center text-sm";

/** What a data block shows in place of its data: a hint, a failure or a skeleton. */
export function DataBlockState({
  kind,
  children,
}: {
  kind: "empty" | "error" | "loading";
  children?: ReactNode;
}) {
  if (kind === "loading") {
    return <Skeleton data-slot="data-block-loading" className="my-2 h-24" />;
  }
  if (kind === "error") {
    return (
      <div
        role="alert"
        className={`${boxClass} border-destructive/50 text-destructive`}
      >
        {children}
      </div>
    );
  }
  return <div className={`${boxClass} text-muted-foreground`}>{children}</div>;
}

/**
 * The element a data block shows in place of its data while it has none to
 * draw: a hint until configured, or a failure. `null` once there is data to
 * draw. Keys are `chelone.block_editor.<name>.empty` and `.error`.
 */
export function useDataBlockGate(
  name: "referenceRecord" | "recordList" | "chart",
  { configured, isError }: { configured: boolean; isError: boolean },
  fallback: { empty: string; error: string },
): ReactElement | null {
  const translate = useTranslate();
  if (!configured) {
    return (
      <DataBlockState kind="empty">
        {translate(`chelone.block_editor.${name}.empty`, {
          _: fallback.empty,
        })}
      </DataBlockState>
    );
  }
  if (isError) {
    return (
      <DataBlockState kind="error">
        {translate(`chelone.block_editor.${name}.error`, {
          _: fallback.error,
        })}
      </DataBlockState>
    );
  }
  return null;
}

export function ConfigField({
  label,
  children,
}: {
  label: (id: string) => ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      {label(id)}
      {children(id)}
    </div>
  );
}

/** A select over the registered resources. */
export function ResourceSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (resource: string) => void;
}) {
  const translate = useTranslate();
  const definitions = useResourceDefinitions();
  const names = Object.keys(definitions);
  return (
    <ConfigField
      label={(id) => (
        <Label htmlFor={id}>
          {translate("chelone.block_editor.data.resource", { _: "Resource" })}
        </Label>
      )}
    >
      {(id) => (
        <NativeSelect
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <NativeSelectOption value="">
            {translate("chelone.block_editor.data.choose_resource", {
              _: "Choose a resource",
            })}
          </NativeSelectOption>
          {names.map((name) => (
            <NativeSelectOption key={name} value={name}>
              {name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </ConfigField>
  );
}

/** Field names as comma-separated text. The draft lets a trailing comma survive the round trip. */
export function FieldsInput({
  fields,
  onChange,
}: {
  fields: readonly string[] | undefined;
  onChange: (fields: string[]) => void;
}) {
  const translate = useTranslate();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <ConfigField
      label={(id) => (
        <Label htmlFor={id}>
          {translate("chelone.block_editor.data.fields", { _: "Fields" })}
        </Label>
      )}
    >
      {(id) => (
        <Input
          id={id}
          placeholder={translate("chelone.block_editor.data.fields_hint", {
            _: "title, status",
          })}
          value={draft ?? (fields ?? []).join(", ")}
          onChange={(event) => {
            const { value } = event.target;
            setDraft(value);
            onChange(
              value
                .split(",")
                .map((field) => field.trim())
                .filter((field) => field !== ""),
            );
          }}
          onBlur={() => setDraft(null)}
        />
      )}
    </ConfigField>
  );
}

/** A whole number between `min` and `max`. A draft lets the user type through a value outside them. */
export function CountInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <ConfigField label={(id) => <Label htmlFor={id}>{label}</Label>}>
      {(id) => (
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={draft ?? String(value)}
          onChange={(event) => {
            const { value: text } = event.target;
            setDraft(text);
            const count = Number(text);
            if (text !== "" && Number.isInteger(count)) {
              if (count >= min && count <= max) onChange(count);
            }
          }}
          onBlur={() => setDraft(null)}
        />
      )}
    </ConfigField>
  );
}

/** A select over fixed choices. A value the choices do not hold changes nothing. */
export function ChoiceSelect<V extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: V;
  choices: readonly { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <ConfigField label={(id) => <Label htmlFor={id}>{label}</Label>}>
      {(id) => (
        <NativeSelect
          id={id}
          value={value}
          onChange={(event) => {
            const chosen = choices.find(
              (choice) => choice.value === event.target.value,
            );
            if (chosen) onChange(chosen.value);
          }}
        >
          {choices.map((choice) => (
            <NativeSelectOption key={choice.value} value={choice.value}>
              {choice.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </ConfigField>
  );
}

export function TextConfig({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ConfigField label={(id) => <Label htmlFor={id}>{label}</Label>}>
      {(id) => (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </ConfigField>
  );
}
