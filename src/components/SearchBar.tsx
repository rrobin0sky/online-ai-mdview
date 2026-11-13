import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

interface SearchBarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  containerRef,
  isOpen,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);

  const clearAllHighlights = useCallback(() => {
    if (!containerRef.current) return;
    const marks = containerRef.current.querySelectorAll("mark.search-highlight");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
    marksRef.current = [];
  }, [containerRef]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      clearAllHighlights();
      if (!containerRef.current || !searchQuery.trim()) {
        setMatchCount(0);
        setCurrentIndex(0);
        return;
      }

      const container = containerRef.current;
      const lowerQuery = searchQuery.toLowerCase();
      const foundMarks: HTMLElement[] = [];

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest("[data-search-ignore]")) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "mark") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes: Text[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }

      for (const textNode of textNodes) {
        const text = textNode.nodeValue || "";
        const lowerText = text.toLowerCase();
        let index = lowerText.indexOf(lowerQuery);
        if (index === -1) continue;

        const parent = textNode.parentNode;
        if (!parent) continue;

        const frag = document.createDocumentFragment();
        let lastIndex = 0;

        while (index !== -1) {
          if (index > lastIndex) {
            frag.appendChild(document.createTextNode(text.substring(lastIndex, index)));
          }

          const mark = document.createElement("mark");
          mark.className =
            "search-highlight px-0.5 rounded-[2px] bg-yellow-200 dark:bg-yellow-900/60 text-zinc-900 dark:text-yellow-200";
          mark.textContent = text.substring(index, index + searchQuery.length);
          frag.appendChild(mark);
          foundMarks.push(mark);

          lastIndex = index + searchQuery.length;
          index = lowerText.indexOf(lowerQuery, lastIndex);
        }

        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        parent.replaceChild(frag, textNode);
      }

      marksRef.current = foundMarks;
      setMatchCount(foundMarks.length);

      if (foundMarks.length > 0) {
        setCurrentIndex(1);
        highlightActive(foundMarks, 0);
      } else {
        setCurrentIndex(0);
      }
    },
    [clearAllHighlights, containerRef]
  );

  const highlightActive = (marks: HTMLElement[], activeIdx: number) => {
    marks.forEach((m, idx) => {
      if (idx === activeIdx) {
        m.classList.remove("bg-yellow-200", "dark:bg-yellow-900/60", "text-zinc-900", "dark:text-yellow-200");
        m.classList.add(
          "bg-amber-500",
          "text-white",
          "dark:bg-amber-400",
          "dark:text-zinc-950",
          "font-semibold",
          "ring-2",
          "ring-amber-500/50"
        );
        m.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        m.classList.remove(
          "bg-amber-500",
          "text-white",
          "dark:bg-amber-400",
          "dark:text-zinc-950",
          "font-semibold",
          "ring-2",
          "ring-amber-500/50"
        );
        m.classList.add("bg-yellow-200", "dark:bg-yellow-900/60", "text-zinc-900", "dark:text-yellow-200");
      }
    });
  };

  const handleNext = () => {
    if (marksRef.current.length === 0) return;
    const nextIdx = (currentIndex % marksRef.current.length) + 1;
    setCurrentIndex(nextIdx);
    highlightActive(marksRef.current, nextIdx - 1);
  };

  const handlePrev = () => {
    if (marksRef.current.length === 0) return;
    const prevIdx = currentIndex <= 1 ? marksRef.current.length : currentIndex - 1;
    setCurrentIndex(prevIdx);
    highlightActive(marksRef.current, prevIdx - 1);
  };

  const handleClose = () => {
    clearAllHighlights();
    setQuery("");
    setMatchCount(0);
    setCurrentIndex(0);
    onClose();
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      clearAllHighlights();
    }
  }, [isOpen, clearAllHighlights]);

  // Handle Enter / Shift+Enter / Esc
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-search-ignore="true"
      className="sticky top-3 float-right mr-6 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xl text-xs transition-all animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <Search className="w-3.5 h-3.5 text-zinc-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          performSearch(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Find in document..."
        className="w-48 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none text-xs"
      />

      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 px-1 min-w-[3rem] text-center select-none">
        {matchCount > 0 ? `${currentIndex}/${matchCount}` : query ? "0/0" : ""}
      </span>

      <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-1.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={matchCount === 0}
          title="Previous Match (Shift+Enter)"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 dark:text-zinc-400 cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={matchCount === 0}
          title="Next Match (Enter)"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-500 dark:text-zinc-400 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          title="Close (Esc)"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer ml-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
