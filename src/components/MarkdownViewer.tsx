import React, { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import { createMarkdownRenderer, initHighlighter } from "../lib/markdown";
import { extractTocFromContainer } from "../lib/toc";
import { TocItem } from "../types";

// Module-level SVG cache to prevent repeated AST layout & rendering for identical diagrams
const mermaidSvgCache = new Map<string, string>();

interface MarkdownViewerProps {
  content: string;
  onTocChange: (items: TocItem[]) => void;
  isDark: boolean;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  onTocChange,
  isDark,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlighterReady, setHighlighterReady] = useState(false);
  const renderGenRef = useRef(0);

  // Initialize Shiki highlighter on mount
  useEffect(() => {
    initHighlighter().then(() => {
      setHighlighterReady(true);
    });
  }, []);

  // Create renderer instance based on current dark/light mode
  const md = useMemo(() => {
    return createMarkdownRenderer(isDark);
  }, [isDark, highlighterReady]);

  // Render markdown HTML
  const renderedHtml = useMemo(() => {
    if (!content) return "";
    return md.render(content);
  }, [content, md]);

  // Extract TOC and update
  useEffect(() => {
    if (containerRef.current) {
      const items = extractTocFromContainer(containerRef.current);
      onTocChange(items);
    }
  }, [renderedHtml, onTocChange]);

  // Render Mermaid diagrams
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mermaidBlocks = container.querySelectorAll<HTMLElement>(".mermaid-block-wrapper");
    if (mermaidBlocks.length === 0) return;

    const currentGen = ++renderGenRef.current;

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: "transparent",
            mainBkg: "#18181b",
            nodeBorder: "#3f3f46",
            clusterBkg: "#09090b",
            clusterBorder: "#27272a",
            defaultLinkColor: "#94a3b8",
            lineColor: "#94a3b8",
            textColor: "#f8fafc",
            titleColor: "#f8fafc",
            nodeTextColor: "#f8fafc",
            edgeLabelBackground: "#18181b",
            labelBkg: "#18181b",
            labelBoxBkgColor: "#18181b",
          }
        : {
            darkMode: false,
            background: "transparent",
            mainBkg: "#ffffff",
            nodeBorder: "#cbd5e1",
            clusterBkg: "#f8fafc",
            clusterBorder: "#e2e8f0",
            defaultLinkColor: "#64748b",
            lineColor: "#64748b",
            textColor: "#0f172a",
            titleColor: "#0f172a",
            nodeTextColor: "#0f172a",
            edgeLabelBackground: "#ffffff",
            labelBkg: "#ffffff",
            labelBoxBkgColor: "#ffffff",
          },
    });

    const applyEdgeContrast = (target: HTMLElement, isDarkTheme: boolean) => {
      const allEdgeLabels = target.querySelectorAll<HTMLElement | SVGElement>(
        ".edgeLabel, .labelBkg, .edgeLabels g, .edgeLabels rect, .edgeLabel rect, .edgeLabel polygon, .edgeLabel div, .edgeLabel p, .edgeLabel span, [class*='edgeLabel']"
      );
      allEdgeLabels.forEach((el) => {
        if (el instanceof SVGElement) {
          const tag = el.tagName.toLowerCase();
          if (tag === "rect" || tag === "polygon") {
            el.setAttribute("fill", isDarkTheme ? "#18181b" : "#ffffff");
            el.setAttribute("stroke", isDarkTheme ? "#3f3f46" : "#cbd5e1");
          } else if (tag === "text" || tag === "tspan") {
            el.setAttribute("fill", isDarkTheme ? "#f8fafc" : "#0f172a");
          }
        } else if (el instanceof HTMLElement) {
          el.style.backgroundColor = isDarkTheme ? "#18181b" : "#ffffff";
          el.style.color = isDarkTheme ? "#f8fafc" : "#0f172a";
        }
      });
    };

    mermaidBlocks.forEach(async (block, index) => {
      const encoded = block.getAttribute("data-mermaid");
      if (!encoded) return;
      const code = decodeURIComponent(encoded);
      const target = block.querySelector<HTMLElement>(".mermaid-target");
      if (!target) return;

      const cacheKey = `${isDark ? "dark" : "light"}::${code.trim()}`;

      // Performance: instantly serve from in-memory SVG cache if unchanged
      if (mermaidSvgCache.has(cacheKey)) {
        target.innerHTML = mermaidSvgCache.get(cacheKey)!;
        applyEdgeContrast(target, isDark);
        return;
      }

      const id = `mermaid-${Date.now()}-${index}`;
      try {
        const { svg } = await mermaid.render(id, code);
        // Guard against stale renders
        if (currentGen !== renderGenRef.current) return;
        mermaidSvgCache.set(cacheKey, svg);
        target.innerHTML = svg;
        applyEdgeContrast(target, isDark);
      } catch (err) {
        console.warn("Mermaid render error:", err);
        const rawEl = block.querySelector<HTMLElement>(".mermaid-raw-code");
        if (rawEl) {
          rawEl.classList.remove("hidden");
          target.innerHTML = `<p class="text-xs text-amber-500 font-mono mt-1">Diagram syntax notice: rendered in fallback mode</p>`;
        }
      }
    });
  }, [renderedHtml, isDark]);

  // Event delegation for code block copy buttons
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle code block collapse / expand
      const collapseBtn = target.closest(".collapse-toggle-btn") as HTMLButtonElement | null;
      if (collapseBtn) {
        e.preventDefault();
        e.stopPropagation();
        const codeBlock = collapseBtn.closest(".code-block-container");
        if (codeBlock) {
          const bodyEl = codeBlock.querySelector(".code-block-body");
          const overlayEl = codeBlock.querySelector(".code-expand-overlay");
          if (bodyEl) {
            const isCurrentlyCollapsed = bodyEl.classList.contains("code-collapsed");
            if (isCurrentlyCollapsed) {
              bodyEl.classList.remove("code-collapsed", "max-h-[380px]", "overflow-hidden");
              bodyEl.classList.add("overflow-x-auto");
              if (overlayEl) overlayEl.classList.add("hidden");
              collapseBtn.textContent = "Collapse";
            } else {
              bodyEl.classList.add("code-collapsed", "max-h-[380px]", "overflow-hidden");
              bodyEl.classList.remove("overflow-x-auto");
              if (overlayEl) overlayEl.classList.remove("hidden");
              collapseBtn.textContent = "Expand";
            }
          }
        }
        return;
      }

      const copyBtn = target.closest(".copy-btn") as HTMLButtonElement | null;
      if (!copyBtn) return;

      e.preventDefault();
      e.stopPropagation();

      const encodedCode = copyBtn.getAttribute("data-code");
      if (!encodedCode) return;

      const code = decodeURIComponent(encodedCode);

      try {
        await navigator.clipboard.writeText(code);

        // Feedback state
        const labelEl = copyBtn.querySelector(".copy-label");

        if (labelEl) labelEl.textContent = "Copied!";
        copyBtn.classList.add("text-emerald-600", "dark:text-emerald-400");

        setTimeout(() => {
          if (labelEl) labelEl.textContent = "Copy";
          copyBtn.classList.remove("text-emerald-600", "dark:text-emerald-400");
        }, 1500);
      } catch (err) {
        console.error("Failed to copy code to clipboard:", err);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [renderedHtml]);

  if (!content.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-400 dark:text-zinc-500">
        <p className="text-base font-medium mb-1">No file opened</p>
        <p className="text-xs">Run <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">mdview &lt;file.md&gt;</code> to view a document</p>
      </div>
    );
  }

  return (
    <main className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="w-full markdown-body transition-colors"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </main>
  );
};
