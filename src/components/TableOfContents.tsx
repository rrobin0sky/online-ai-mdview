import React, { useEffect, useState } from "react";
import { TocItem } from "../types";
import { scrollToHeading } from "../lib/toc";

interface TableOfContentsProps {
  items: TocItem[];
  containerId?: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  containerId = "reader-container",
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
    <nav className="space-y-1 text-xs select-none">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const indent = Math.max(0, (item.level - 1) * 8);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveId(item.id);
              scrollToHeading(item.id, document.getElementById(containerId));
            }}
            style={{ paddingLeft: `${indent + 8}px` }}
            className={`w-full text-left py-1 pr-2 transition-all block truncate cursor-pointer border-l-2 text-[12px] leading-snug ${
              isActive
                ? "border-blue-500 text-blue-600 dark:text-blue-400 font-semibold pl-2 bg-blue-50/30 dark:bg-blue-950/20"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 pl-2"
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
