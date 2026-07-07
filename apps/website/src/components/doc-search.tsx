import { CornerDownLeft, Search } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { navTree } from "@/docs/nav-content";
import { searchIndex } from "@/docs/search-index";
import { fallbackIcon, SECTION_META } from "@/docs/section-meta";

const EASE = "cubic-bezier(0.32,0.72,0,1)";

// searchIndex carries the section *title*; SECTION_META is keyed by *dir*, so
// resolve the icon through navTree once.
const iconByTitle = new Map<string, typeof fallbackIcon>(
  navTree.map(
    (s) => [s.title, SECTION_META[s.dir]?.icon ?? fallbackIcon] as const,
  ),
);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Substring scoring (not cmdk's loose fuzzy subsequence): a title match ranks
// far above a section/description match, so "datatable" surfaces DataTable.
function score(value: string, search: string, keywords?: string[]): number {
  const s = norm(search);
  if (!s) return 1;
  const title = norm(value);
  if (title.includes(s)) return title.startsWith(s) ? 1 : 0.7;
  if (keywords?.some((k) => norm(k).includes(s))) return 0.3;
  return 0;
}

/** A single keycap. */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border/70 bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]">
      {children}
    </kbd>
  );
}

export function DocSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // ⌘K / Ctrl-K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Trigger — magnetic, brand-tinted on hover. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ transitionTimingFunction: EASE }}
        className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-px hover:border-primary/40 hover:bg-muted hover:text-foreground active:scale-[0.98] sm:w-60"
      >
        <Search
          className="size-4 transition-colors duration-300 group-hover:text-primary"
          strokeWidth={1.75}
        />
        <span className="hidden sm:inline">Search docs…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-[5px] border border-border/60 bg-background px-1.5 font-mono text-[10px] sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-2xl border-white/10 bg-popover/90 p-0 shadow-2xl backdrop-blur-xl sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Search documentation</DialogTitle>

          {/* Ethereal-glass brand orb + top hairline for spatial depth. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-70"
          />

          {/* Roomier input row: shadcn's CommandInput wrapper is a cramped
              fixed h-9/px-3 — restyle it via the parent (taller, more padding,
              wider icon gap) without forking the shared component. */}
          <Command
            filter={score}
            className="bg-transparent [&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]]:border-white/5 [&_[data-slot=command-input-wrapper]]:px-5 [&_[data-slot=command-input-wrapper]_svg]:size-[18px] [&_[data-slot=command-input-wrapper]_svg]:opacity-60"
          >
            <div className="relative">
              <CommandInput
                placeholder="Search documentation…"
                className="h-16 pr-14 text-base"
              />
              <kbd className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-[5px] border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                esc
              </kbd>
            </div>

            <CommandList className="max-h-[min(62vh,420px)] scroll-py-2 p-2">
              <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
                <Search
                  className="mx-auto mb-3 size-6 opacity-40"
                  strokeWidth={1.5}
                />
                No matching pages.
              </CommandEmpty>

              {/* Flat list (no groups) so cmdk sorts ALL results by score
                  globally — a strong title match always ranks first. */}
              {searchIndex.map((e) => {
                const Icon = iconByTitle.get(e.section) ?? fallbackIcon;
                return (
                  <CommandItem
                    key={e.path}
                    // title first (so substring scoring ranks it) + path for a
                    // unique value; section/description as secondary matches.
                    value={`${e.title} ${e.path}`}
                    keywords={[e.section, e.description]}
                    onSelect={() => go(e.path)}
                    style={{ transitionTimingFunction: EASE }}
                    className="group/item gap-3 rounded-lg px-2.5 py-2 transition-colors duration-200 data-[selected=true]:bg-primary/10"
                  >
                    {/* Icon chip — lights up brand-gradient on the active row. */}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors duration-200 group-data-[selected=true]/item:bg-brand-gradient group-data-[selected=true]/item:text-white">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>

                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-foreground">
                        {e.title}
                      </span>
                      {e.description ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {e.description}
                        </span>
                      ) : null}
                    </div>

                    <span className="ml-auto shrink-0 truncate text-[11px] text-muted-foreground/80">
                      {e.section}
                    </span>
                    <CornerDownLeft
                      className="size-3.5 shrink-0 text-primary opacity-0 transition-opacity duration-200 group-data-[selected=true]/item:opacity-100"
                      strokeWidth={1.75}
                    />
                  </CommandItem>
                );
              })}
            </CommandList>

            {/* Keyboard-hint footer. */}
            <div className="flex items-center gap-3 border-t border-white/5 px-3 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd>
                open
              </span>
              <span className="ml-auto font-medium">Chelone docs</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
