import { useState } from "react";
import type { InstallCommands } from "@/docs/types";
import { cn } from "@/lib/utils";

export type { InstallCommands };

interface InstallCommandProps {
  install: InstallCommands;
}

type PackageManager = keyof InstallCommands;

const TABS: { key: PackageManager; label: string }[] = [
  { key: "pnpm", label: "pnpm" },
  { key: "npm", label: "npm" },
  { key: "yarn", label: "yarn" },
  { key: "bun", label: "bun" },
];

export function InstallCommand({ install }: InstallCommandProps) {
  const [active, setActive] = useState<PackageManager>("pnpm");
  const [copied, setCopied] = useState(false);

  const command = install[active];

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      {/* Tab bar — active tab marked with a primary underline (high contrast) */}
      <div className="flex items-center gap-1 border-b border-border px-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-2 text-xs font-medium transition-colors",
              active === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Command + copy */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <code className="text-sm font-mono text-foreground break-all">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy install command"
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            copied
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
