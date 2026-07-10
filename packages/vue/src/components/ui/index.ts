// @chelone/vue — the minimal shadcn-vue `ui/` primitive slice the V1 admin
// vertical needs (button, input, switch, checkbox, native-select, field family,
// table family, card family). Native-backed + dependency-free; reka-ui prop
// diffs are adapted per primitive (see each file's header).

export { default as Button } from "./button.vue";
export {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { default as Checkbox } from "./checkbox.vue";
export {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "./field";
export { default as Input } from "./input.vue";
export { default as NativeSelect } from "./native-select.vue";
export { default as Switch } from "./switch.vue";
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
