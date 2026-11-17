import React, { useEffect, useState } from "react";
import { TocItem } from "../types";
import { scrollToHeading } from "../lib/toc";

interface TableOfContentsProps {
  items: TocItem[];
  containerId?: string;
  zoomLevel?: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  containerId = "reader-container",
  zoomLevel = 1.0,
}) => {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const rootElement = document.getElementById(containerId);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: rootElement,
        rootMargin: "-20px 0% -70% 0%",
        threshold: 0,
      }
    );

    items.forEach((item) => {
      let el = document.getElementById(item.id);
      if (!el) {
        try {
          el =
            document.getElementById(decodeURIComponent(item.id)) ||
            document.getElementById(encodeURIComponent(item.id));
        } catch {
          // ignore
        }
      }
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, containerId]);

  if (items.length === 0) return null;

  return (
    <nav className="space-y-1 select-none" style={{ zoom: zoomLevel }}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        const indent = Math.max(0, (item.level - 1) * 10);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveId(item.id);
              scrollToHeading(item.id, document.getElementById(containerId));
            }}
            style={{ paddingLeft: `${indent + 10}px` }}
            className={`w-full text-left py-1.5 pr-2.5 rounded-r-md transition-all block truncate cursor-pointer border-l-2 text-[13px] leading-snug ${
              isActive
                ? "border-blue-500 text-blue-400 font-medium bg-blue-500/10"
                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
            }`}
            title={item.text}
          >
            <span className="truncate block">{item.text}</span>
          </button>
        );
      })}
    </nav>
  );
};
