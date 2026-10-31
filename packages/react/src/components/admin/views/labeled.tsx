import {
  Children,
  createElement,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { cn } from "@/lib/utils";
import { RecordField } from "../fields/record-field";

interface LabeledProps {
  /** The one field (or input) to label. */
  children: ReactElement;
  /** Overrides the child's `label`; `false` renders no label. */
  label?: ReactNode;
  /** Overrides the child's `source` when resolving the label. */
  source?: string;
  /** Overrides the child's `resource` when resolving the label. */
  resource?: string;
  isRequired?: boolean;
  /** Makes the label a `<label>` for the control with this id. */
  htmlFor?: string;
  fullWidth?: boolean;
  /** The wrapper element. Defaults to `div`. */
  component?: ElementType;
  className?: string;
}

interface ChildLabelProps {
  label?: ReactNode;
  source?: string;
  resource?: string;
}

/**
 * Labels a plain field from its `source`, for layouts that do not wrap every
 * field in a `<RecordField>` (tabbed show, translatable fields).
 *
 * The label is skipped when `label` is `false`, the child's `label` is `false`,
 * or the child is a native DOM element, a `<Labeled>` or a `<RecordField>`,
 * which label themselves.
 *
 * @example
 * <Labeled>
 *   <TextField source="title" />
 * </Labeled>
 */
function Labeled(props: LabeledProps): ReactElement {
  const {
    children,
    label,
    source,
    resource,
    isRequired,
    htmlFor,
    fullWidth,
    component = "div",
    className,
  } = props;
  const child = Children.only(children) as ReactElement<ChildLabelProps>;
  const childProps = child.props;
  const labelsItself =
    typeof child.type === "string" ||
    child.type === Labeled ||
    child.type === RecordField;
  const resolvedLabel = label ?? childProps.label;
  const showLabel =
    !labelsItself && label !== false && childProps.label !== false;

  return createElement(
    component,
    { className: cn("flex flex-col gap-1", fullWidth && "w-full", className) },
    showLabel ? (
      <label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        <FieldLabelText
          label={resolvedLabel}
          source={source ?? childProps.source}
          resource={resource ?? childProps.resource}
          isRequired={isRequired}
        />
      </label>
    ) : null,
    child,
  );
}

export { Labeled, type LabeledProps };
