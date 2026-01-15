import type { DocsTocItem } from "@/lib/docs/toc";
import { cn } from "@/lib/utils";

export function DocsToc({ items, className }: { items: DocsTocItem[]; className?: string }) {
  if (!items.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <nav className="space-y-1 text-sm">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "block truncate text-muted-foreground hover:text-foreground",
              item.level === 3 && "pl-3 text-[0.8125rem]",
              item.level === 4 && "pl-6 text-[0.8125rem]",
            )}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

