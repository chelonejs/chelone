/**
 * FrameworkCode: a React fence and a Vue fence as one block, showing the one
 * `useFramework` picks, with the same React/Vue buttons the component previews
 * use — so one switch moves the code and the preview together.
 *
 * MDX hands the fences over already highlighted: rehype-pretty-code turns each
 * into a `<figure>` whose `<pre>` and `<code>` carry `data-language`. The Vue
 * side is the fence whose language is `vue`; every other fence is the React side.
 */
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { FrameworkSwitch } from "./framework-switch";
import { useFramework } from "./use-framework";

/** A highlighted fence, as rehype-pretty-code leaves it in the MDX output. */
interface FenceProps {
  "data-language"?: string;
  children?: ReactNode;
}

/** The fence's language, which the highlighter names on the elements inside it. */
function fenceLanguage(node: ReactNode): string | undefined {
  if (!isValidElement<FenceProps>(node)) return undefined;
  const { "data-language": language } = node.props;
  if (language) return language;
  for (const child of Children.toArray(node.props.children)) {
    const found = fenceLanguage(child);
    if (found) return found;
  }
  return undefined;
}

function isFence(node: ReactNode): node is ReactElement<FenceProps> {
  return fenceLanguage(node) !== undefined;
}

interface FrameworkCodeProps {
  children: ReactNode;
}

export function FrameworkCode({ children }: FrameworkCodeProps) {
  const [framework, setFramework] = useFramework();
  const fences = Children.toArray(children).filter(isFence);
  const react = fences.filter((fence) => fenceLanguage(fence) !== "vue");
  const vue = fences.filter((fence) => fenceLanguage(fence) === "vue");
  const shown = framework === "vue" ? vue : react;

  if (fences.length === 0) return null;

  return (
    <section className="my-4">
      {react.length > 0 && vue.length > 0 ? (
        <FrameworkSwitch framework={framework} onChange={setFramework} />
      ) : null}
      <div>{shown.length > 0 ? shown : react}</div>
    </section>
  );
}
