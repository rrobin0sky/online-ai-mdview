import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import taskLists from "markdown-it-task-lists";
import { createHighlighter, Highlighter } from "shiki";

let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "html",
  "css",
  "json",
  "markdown",
  "bash",
  "sh",
  "python",
  "rust",
  "go",
  "c",
  "cpp",
  "sql",
  "yaml",
  "toml",
  "dockerfile",
  "diff",
];

export async function initHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return highlighterInstance;
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: SUPPORTED_LANGS,
    }).then((h) => {
      highlighterInstance = h;
      return h;
    });
  }
  return highlighterPromise;
}

function slugify(s: string): string {
  const clean = String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5\-]+/g, "");
  return clean || "heading";
}

export function createMarkdownRenderer(isDark: boolean = false) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  md.use(anchor, {
    slugify,
    permalink: false,
  });

  md.use(taskLists, {
    enabled: true,
    label: true,
    labelAfter: true,
  });

  const defaultFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : "";
    const lang = info.split(/\s+/)[0].toLowerCase();
    const code = token.content;
    const encodedCode = encodeURIComponent(code);
    const displayLang = lang || "text";

    // If it's a mermaid diagram, output a special container for client-side SVG rendering
    if (lang === "mermaid") {
      return `
<div class="mermaid-block-wrapper my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 p-4 shadow-xs" data-mermaid="${encodedCode}">
  <div class="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5 select-none">
    <span class="font-mono text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
      <svg class="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>
      Mermaid Diagram
    </span>
    <button type="button" class="copy-btn inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" data-code="${encodedCode}">
      <span class="copy-label">Copy Source</span>
    </button>
  </div>
  <div class="mermaid-diagram-container overflow-x-auto py-2 flex justify-center">
    <div class="mermaid-raw-code hidden">${md.utils.escapeHtml(code)}</div>
    <div class="mermaid-target flex justify-center w-full"></div>
  </div>
</div>`;
    }

    let highlightedCode = "";

    if (highlighterInstance) {
      try {
        const theme = isDark ? "github-dark" : "github-light";
        const hasLang = highlighterInstance.getLoadedLanguages().includes(lang);
        const resolvedLang = hasLang ? lang : "text";

        highlightedCode = highlighterInstance.codeToHtml(code, {
          lang: resolvedLang,
          theme,
        });
      } catch (err) {
        console.warn("Shiki highlight error:", err);
      }
    }

    if (!highlightedCode) {
      highlightedCode = defaultFence
        ? defaultFence(tokens, idx, options, env, self)
        : `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`;
    }

    const lineCount = code.trim().split("\n").length;
    const isLongCode = lineCount > 25;

    return `
<div class="code-block-container group relative my-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#f8fafc] dark:bg-[#0d1117] overflow-hidden shadow-xs" data-lines="${lineCount}">
  <div class="code-block-header flex items-center justify-between px-3.5 py-1.5 text-xs border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/40 select-none">
    <div class="flex items-center gap-2">
      <span class="font-mono text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">${displayLang}</span>
      ${isLongCode ? `<span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">(${lineCount} lines)</span>` : ""}
    </div>
    <div class="flex items-center gap-2">
      ${
        isLongCode
          ? `<button type="button" class="collapse-toggle-btn text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">Expand</button>`
          : ""
      }
      <button type="button" class="copy-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer" data-code="${encodedCode}">
        <svg class="copy-icon w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <span class="copy-label pointer-events-none">Copy</span>
      </button>
    </div>
  </div>
  <div class="code-block-body ${isLongCode ? "max-h-[380px] overflow-hidden relative code-collapsed" : "overflow-x-auto"} text-[13.5px] leading-relaxed p-4 font-mono">
    ${highlightedCode}
    ${
      isLongCode
        ? `<div class="code-expand-overlay absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f8fafc] dark:from-[#0d1117] to-transparent flex items-end justify-center pb-2 pointer-events-none">
            <span class="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full shadow-xs">
              Click Expand above to view all ${lineCount} lines
            </span>
          </div>`
        : ""
    }
  </div>
</div>`;
  };

  return md;
}
