import { type Component, defineComponent, h, markRaw } from "vue";
import { provideResourceContext } from "../resource-context";

/**
 * A resource's view as its route renders it: the view itself, with `name`
 * provided as the ambient resource, so a view that is given no `resource`
 * prop, such as a guesser, reads it from context. The React `<Resource>` does
 * the same around its views.
 */
export function resourceView(name: string, view: Component): Component {
  return markRaw(
    defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs, slots }) {
        provideResourceContext(name);
        return () => h(view, attrs, slots);
      },
    }),
  );
}
