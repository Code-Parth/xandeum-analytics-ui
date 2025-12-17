"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, ExternalLink } from "lucide-react";

type ChartInfoItem = {
  label: string;
  value: string;
};

// GitHub documentation base URL
const DOCS_BASE_URL =
  "https://github.com/Code-Parth/xandeum-analytics-ui/blob/main/docs/METRICS_DOCUMENTATION.md";

export function ChartInfoHover({
  items,
  ariaLabel,
  docsAnchor,
}: {
  items: ChartInfoItem[];
  ariaLabel: string;
  docsAnchor?: string;
}) {
  const docsUrl = docsAnchor ? `${DOCS_BASE_URL}#${docsAnchor}` : DOCS_BASE_URL;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
          <Info className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72">
        <div className="space-y-2">
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.label} className="flex gap-2 text-xs">
                <span className="text-muted-foreground shrink-0">
                  {item.label}:
                </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors">
              <ExternalLink className="h-3 w-3" />
              <span>View calculation details</span>
            </a>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
