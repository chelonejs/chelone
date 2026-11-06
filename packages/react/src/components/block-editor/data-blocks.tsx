import {
  formatDataBlockValue,
  pickDataBlockFields,
  readDataBlockValue,
  recordListBlockSpec,
  referenceRecordBlockSpec,
} from "@chelone/core";
import { DatabaseIcon, TableIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetList, useGetOne } from "../../hooks";
import { useTranslate } from "../../i18n-hooks";
import { useGetRecordRepresentation, useTranslateLabel } from "../../label";
import {
  type BlockConfigProps,
  type BlockRenderProps,
  defineBlock,
} from "./block-nodes";
import { chartBlock } from "./chart-block";
import {
  type AttrsOf,
  ChoiceSelect,
  ConfigField,
  CountInput,
  DataBlockState,
  FieldsInput,
  ResourceSelect,
  useDataBlockGate,
} from "./data-block-parts";

type ReferenceRecordAttrs = AttrsOf<typeof referenceRecordBlockSpec>;
type RecordListAttrs = AttrsOf<typeof recordListBlockSpec>;

function ReferenceRecordView({
  attrs,
}: BlockRenderProps<ReferenceRecordAttrs>) {
  const { resource, id, fields, layout } = attrs;
  const translateLabel = useTranslateLabel();
  const representation = useGetRecordRepresentation(resource);
  const configured = resource !== "" && id !== null && id !== "";
  const { data, isError } = useGetOne(
    resource,
    { id: id ?? "" },
    { enabled: configured },
  );

  const gate = useDataBlockGate(
    "referenceRecord",
    { configured, isError },
    {
      empty: "Choose a resource and a record id",
      error: "The record could not be loaded",
    },
  );
  if (gate) return gate;
  // Configured and not failed, so the read is still on its way.
  if (data === undefined) return <DataBlockState kind="loading" />;

  const title = representation(data);
  if (layout === "inline") {
    return (
      <Badge variant="secondary" className="my-1">
        {title}
      </Badge>
    );
  }
  return (
    <Card className="my-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {pickDataBlockFields(data, fields).map((field) => (
            <div key={field} className="contents">
              <dt className="text-muted-foreground">
                {translateLabel({ source: field, resource })}
              </dt>
              <dd>{formatDataBlockValue(readDataBlockValue(data, field))}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ReferenceRecordConfig({
  attrs,
  onChange,
}: BlockConfigProps<ReferenceRecordAttrs>) {
  const translate = useTranslate();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ResourceSelect
        value={attrs.resource}
        onChange={(resource) => onChange({ resource })}
      />
      <ConfigField
        label={(id) => (
          <Label htmlFor={id}>
            {translate("chelone.block_editor.referenceRecord.id", {
              _: "Record id",
            })}
          </Label>
        )}
      >
        {(id) => (
          <Input
            id={id}
            value={attrs.id === null ? "" : String(attrs.id)}
            onChange={(event) => {
              const value = event.target.value.trim();
              onChange({ id: value === "" ? null : value });
            }}
          />
        )}
      </ConfigField>
      <FieldsInput
        fields={attrs.fields}
        onChange={(fields) => onChange({ fields })}
      />
      <ChoiceSelect
        label={translate("chelone.block_editor.referenceRecord.layout", {
          _: "Layout",
        })}
        value={attrs.layout}
        choices={[
          {
            value: "card",
            label: translate("chelone.block_editor.referenceRecord.card", {
              _: "Card",
            }),
          },
          {
            value: "inline",
            label: translate("chelone.block_editor.referenceRecord.inline", {
              _: "Inline",
            }),
          },
        ]}
        onChange={(layout) => onChange({ layout })}
      />
    </div>
  );
}

/** A live record of any resource, as a card of its fields or an inline badge of its title. */
export const referenceRecordBlock = defineBlock({
  ...referenceRecordBlockSpec,
  config: ReferenceRecordConfig,
  icon: DatabaseIcon,
  render: ReferenceRecordView,
});

function RecordListView({ attrs }: BlockRenderProps<RecordListAttrs>) {
  const { resource, perPage, fields } = attrs;
  const translate = useTranslate();
  const translateLabel = useTranslateLabel();
  const configured = resource !== "";
  const { data, isError } = useGetList(
    resource,
    { pagination: { page: 1, perPage } },
    { enabled: configured },
  );

  const gate = useDataBlockGate(
    "recordList",
    { configured, isError },
    { empty: "Choose a resource", error: "The records could not be loaded" },
  );
  if (gate) return gate;
  // Configured and not failed, so the read is still on its way.
  if (data === undefined) return <DataBlockState kind="loading" />;

  const [first] = data.data;
  if (first === undefined) {
    return (
      <DataBlockState kind="empty">
        {translate("chelone.block_editor.recordList.no_records", {
          _: "No records",
        })}
      </DataBlockState>
    );
  }
  const columns = pickDataBlockFields(first, fields, 3);
  return (
    <Table className="my-2">
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>
              {translateLabel({ source: column, resource })}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((row) => (
          <TableRow key={String(row.id)}>
            {columns.map((column) => (
              <TableCell key={column}>
                {formatDataBlockValue(readDataBlockValue(row, column))}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecordListConfig({
  attrs,
  onChange,
}: BlockConfigProps<RecordListAttrs>) {
  const translate = useTranslate();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ResourceSelect
        value={attrs.resource}
        onChange={(resource) => onChange({ resource })}
      />
      <FieldsInput
        fields={attrs.fields}
        onChange={(fields) => onChange({ fields })}
      />
      <CountInput
        label={translate("chelone.block_editor.recordList.per_page", {
          _: "Rows",
        })}
        value={attrs.perPage}
        min={1}
        max={50}
        onChange={(perPage) => onChange({ perPage })}
      />
    </div>
  );
}

/** The first rows of a resource, as a table of up to three columns. */
export const recordListBlock = defineBlock({
  ...recordListBlockSpec,
  config: RecordListConfig,
  icon: TableIcon,
  render: RecordListView,
});

/** The data blocks: reference record, record list and chart. */
export const dataBlocks = [referenceRecordBlock, recordListBlock, chartBlock];
