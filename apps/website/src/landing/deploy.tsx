import { Reveal, RevealItem } from "./reveal";
import {
  BezelPanel,
  Eyebrow,
  Heading,
  Lead,
  LogoChip,
  Section,
} from "./section";
import { WindowChrome } from "./window-chrome";

const deployLogos = [
  { label: "Vercel", src: "/img/logo-vercel.svg", silhouette: true },
  { label: "Netlify", src: "/img/netlify-logo.svg" },
  { label: "GitHub Pages", src: "/img/github-logo.svg", silhouette: true },
  { label: "Cloudflare", src: "/img/cloudflare-logo.svg" },
];

/** "Host Anywhere" split: copy + host chips beside an install-command terminal. */
export function Deploy() {
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy + logo chips */}
        <Reveal>
          <Eyebrow>Zero Lock-In</Eyebrow>
          <Heading>
            Host <span className="text-brand-gradient">Anywhere</span>
          </Heading>
          <Lead>
            Chelone apps are lightweight, static assets you can host almost
            anywhere—for close to nothing. When you go to production, you own
            your app. No hidden fees, no SSO paywalls, and no surprises.
          </Lead>

          <RevealItem className="mt-8 flex flex-wrap items-center gap-3">
            {deployLogos.map((logo) => (
              <LogoChip
                key={logo.label}
                label={logo.label}
                src={logo.src}
                silhouette={logo.silhouette}
              />
            ))}
          </RevealItem>
        </Reveal>

        {/* Terminal */}
        <Reveal delay={0.1}>
          <BezelPanel>
            <WindowChrome title="Terminal">
              <div className="bg-zinc-950 p-5 font-mono text-sm leading-relaxed">
                <span className="text-zinc-500">$ </span>
                <span className="text-zinc-100">
                  npx shadcn@latest add https://chelone.dev/r/admin.json
                </span>
              </div>
            </WindowChrome>
          </BezelPanel>
        </Reveal>
      </div>
    </Section>
  );
}
