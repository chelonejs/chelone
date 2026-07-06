import { ShikiHighlighter } from "react-shiki";
import { SHIKI_THEME } from "@/lib/shiki-theme";
import { Reveal } from "./reveal";
import { BezelPanel, Heading, Lead, Section } from "./section";
import { WindowChrome } from "./window-chrome";

const APP_TSX = `import { Admin, Resource } from "@chelone/react";
import { defineResources } from "@chelone/core";
import { z } from "zod";

// 1. Point at a Zod schema — it types the records AND validates the forms.
const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().min(1),
  author_id: z.number({ message: "Pick an author" }),
});
const resources = defineResources({ posts: { schema: postSchema } });

// 2. Compose the views from shadcn blocks.
export const App = () => (
  <Admin dataProvider={dataProvider} resources={resources}>
    <Resource name="posts" list={PostList} edit={PostEdit} />
  </Admin>
);
`;

/** "Built by developers for developers" split: copy beside a syntax-highlighted App.tsx. */
export function CodeShowcase() {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <Reveal>
          <Heading>
            Built by developers{" "}
            <span className="text-brand-gradient">for developers</span>
          </Heading>
          <Lead>
            Composability, separation of concerns, clean code, strong typing and
            smart auto-completion ensure a pleasant DX.
          </Lead>
        </Reveal>

        {/* Code — same react-shiki highlighting as the docs/demo code blocks
            (SHIKI_THEME: light-plus / dark-plus, transparent over the card). */}
        <Reveal delay={0.1}>
          <BezelPanel>
            <WindowChrome title="App.tsx">
              <div className="overflow-x-auto text-sm leading-relaxed">
                <ShikiHighlighter
                  language="tsx"
                  theme={SHIKI_THEME}
                  addDefaultStyles={false}
                  className="!bg-transparent p-5"
                >
                  {APP_TSX}
                </ShikiHighlighter>
              </div>
            </WindowChrome>
          </BezelPanel>
        </Reveal>
      </div>
    </Section>
  );
}
