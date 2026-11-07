import { cn } from "@/lib/utils";
import { FRAMEWORKS, type Framework } from "./use-framework";

interface FrameworkSwitchProps {
  framework: Framework;
  onChange: (next: Framework) => void;
}

/** The React and Vue buttons every docs block with both frameworks shows. */
export function FrameworkSwitch({ framework, onChange }: FrameworkSwitchProps) {
  return (
    <div
      role="group"
      aria-label="Framework"
      className="flex items-center gap-1"
    >
      {FRAMEWORKS.map((f) => (
        <button
          key={f.key}
          type="button"
          aria-pressed={framework === f.key}
          onClick={() => onChange(f.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            framework === f.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
