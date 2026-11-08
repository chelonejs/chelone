import {
  type BlockAttrs,
  describeBlockAttrs,
  type FieldDescriptor,
  humanizeField,
} from "@chelone/core";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { BlockConfigProps, BlockDefinition } from "./block-nodes";

const textKinds: ReadonlySet<FieldDescriptor["kind"]> = new Set([
  "text",
  "email",
  "url",
  "date",
  "dateTime",
]);

const inputTypes: Partial<Record<FieldDescriptor["kind"], string>> = {
  email: "email",
  url: "url",
  date: "date",
  dateTime: "datetime-local",
};

const textOf = (value: BlockAttrs[string]): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

function AutoField({
  descriptor,
  value,
  onChange,
}: {
  descriptor: FieldDescriptor<string>;
  value: BlockAttrs[string];
  onChange: BlockConfigProps["onChange"];
}) {
  const id = useId();
  const { source, kind } = descriptor;
  const label = descriptor.label ?? humanizeField(source);
  const patch = (next: BlockAttrs[string]) => onChange({ [source]: next });

  if (kind === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch id={id} checked={value === true} onCheckedChange={patch} />
        <Label htmlFor={id}>{label}</Label>
      </div>
    );
  }
  const control = (() => {
    if (kind === "select") {
      const choices = descriptor.choices ?? [];
      return (
        <NativeSelect
          id={id}
          value={textOf(value)}
          onChange={(event) => {
            const chosen = choices.find(
              (choice) => String(choice.id) === event.target.value,
            );
            if (chosen) patch(chosen.id);
          }}
        >
          {choices.map((choice) => (
            <NativeSelectOption key={choice.id} value={String(choice.id)}>
              {choice.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    }
    if (kind === "number") {
      return (
        <Input
          id={id}
          type="number"
          value={textOf(value)}
          onChange={(event) =>
            patch(event.target.value === "" ? null : Number(event.target.value))
          }
        />
      );
    }
    if (textKinds.has(kind)) {
      return (
        <Input
          id={id}
          type={inputTypes[kind] ?? "text"}
          value={textOf(value)}
          onChange={(event) => patch(event.target.value)}
        />
      );
    }
    return null;
  })();
  if (control === null) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {control}
    </div>
  );
}

/**
 * The form for `config: "auto"`, built from the block's schema. A key the
 * form cannot edit (an object, an array of objects) gets no control.
 */
export function AutoConfigForm({
  schema,
  attrs,
  onChange,
}: { schema: BlockDefinition["schema"] } & BlockConfigProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {describeBlockAttrs(schema).map((descriptor) => (
        <AutoField
          key={descriptor.source}
          descriptor={descriptor}
          value={attrs[descriptor.source]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
