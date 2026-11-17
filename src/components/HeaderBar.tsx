import React, { useState, useRef, useEffect } from "react";
import {
  PanelLeft,
  FileText,
  ListTree,
  FolderOpen,
  Search,
  Save,
  Copy,
  Check,
  FolderSearch,
  ArrowRight,
  X,
  FilePlus,
  Download,
  Laptop,
  MoreHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Compass,
} from "lucide-react";
import { isTauriEnv, toggleWindowZoom } from "../lib/tauri-bridge";

interface HeaderBarProps {
  filePath: string | null;
  fileName: string;
  isDirectoryMode: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  hasToc?: boolean;
  isTocOpen?: boolean;
  onToggleToc?: () => void;
  zoomLevel?: number;
  onChangeZoom?: (delta: number | "reset") => void;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onExportFile?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenSearch?: () => void;
  isEditing: boolean;
  isSplitView: boolean;
  onSetViewMode: (mode: "read" | "edit" | "split") => void;
  isDirty: boolean;
  onSave?: () => void;
  onOpenPath?: (path: string) => void;
  onRenameFile?: (newName: string) => void;
  onRevealInFinder?: (path: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  filePath,
  fileName,
  isDirectoryMode,
  isSidebarOpen,
  onToggleSidebar,
  hasToc = false,
  isTocOpen = true,
  onToggleToc,
  zoomLevel = 1.0,
  onChangeZoom,
  onNewFile,
  onOpenFile,
  onExportFile,
  onOpenDownloadModal,
  onOpenSearch,
  isEditing,
  isSplitView,
  onSetViewMode,
  isDirty,
  onSave,
  onOpenPath,
  onRenameFile,
  onRevealInFinder,
}) => {
  const inTauri = isTauriEnv();

  // Address Bar State (Desktop)
  const [isAddressBarActive, setIsAddressBarActive] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Renaming State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // More Menu Popover State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Copy Feedback State
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAddressBarActive && addressInputRef.current) {
      addressInputRef.current.focus();
      addressInputRef.current.select();
    }
  }, [isAddressBarActive]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      const dotIndex = renameInput.lastIndexOf(".");
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [isRenaming]);

  // Close More menu on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isMenuOpen]);

  const handleHeaderDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, form, [data-no-drag]")) return;
    toggleWindowZoom(e.altKey);
  };

  const handleStartRename = () => {
    setRenameInput(fileName);
    setIsRenaming(true);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameInput.trim();
    if (trimmed && trimmed !== fileName && onRenameFile) {
      onRenameFile(trimmed);
    }
    setIsRenaming(false);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (trimmed && onOpenPath) {
      onOpenPath(trimmed);
    }
    setIsAddressBarActive(false);
  };

  const handleCopyPath = async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  const currentMode: "read" | "edit" | "split" = !isEditing
    ? "read"
    : isSplitView
      ? "split"
      : "edit";

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleHeaderDoubleClick}
      className={`h-12 flex items-center justify-between pr-4 ${
        inTauri ? "pl-20" : "pl-4"
      } bg-[#0d0f12]/80 backdrop-blur-xl border-b border-white/[0.06] select-none flex-shrink-0 z-20 relative`}
    >
      {/* Left: Sidebar Toggle & Clean Document Title */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2.5 min-w-0 flex-1 pr-4"
      >
        {isDirectoryMode && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0 ${
              isSidebarOpen
                ? "text-white bg-white/[0.1]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            }`}
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {isAddressBarActive ? (
          <form
            onSubmit={handleAddressSubmit}
            className="flex items-center gap-1.5 flex-1 max-w-lg"
          >
            <div className="relative flex-1 flex items-center">
              <input
                ref={addressInputRef}
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setIsAddressBarActive(false);
                  }
                }}
                onBlur={() => setTimeout(() => setIsAddressBarActive(false), 150)}
                placeholder="Enter file or folder path..."
                className="w-full h-7 pl-2.5 pr-7 rounded-lg text-xs font-mono bg-zinc-900/90 border border-blue-500/70 text-zinc-100 outline-none select-text"
              />
              <button
                type="button"
                onClick={() => setIsAddressBarActive(false)}
                className="absolute right-1.5 p-0.5 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="submit"
              className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Go</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <div
            data-no-drag
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleStartRename();
            }}
            title={
              inTauri && filePath
                ? `${filePath} (Double-click to rename)`
                : "Double-click to rename"
            }
            className="flex items-center gap-2 min-w-0 cursor-default"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-blue-400/90" />
            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="inline-flex items-center">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setIsRenaming(false);
                    }
                  }}
                  onBlur={handleRenameSubmit}
                  className="h-6 px-2 rounded-md text-xs font-medium bg-zinc-900 border border-blue-500/70 text-zinc-100 outline-none select-text"
                />
              </form>
            ) : (
              <span className="text-[13px] font-medium text-zinc-200 truncate hover:text-white transition-colors">
                {fileName || "Untitled"}
              </span>
            )}
            {isDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                title="Unsaved changes (⌘S)"
              />
            )}
          </div>
        )}
      </div>

      {/* Right: Restrained Apple-style Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isEditing && isDirty && onSave && (
          <button
            type="button"
            onClick={onSave}
            title="Save (⌘S)"
            className="h-7 px-2.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>
        )}

        {/* Segmented Control: Read | Edit | Split */}
        <div
          data-no-drag
          className="flex items-center p-0.5 rounded-lg bg-white/[0.05] border border-white/[0.07]"
        >
          {(["read", "edit", "split"] as const).map((mode) => {
            const active = currentMode === mode;
            const label = mode === "read" ? "Read" : mode === "edit" ? "Edit" : "Split";
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onSetViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-white/[0.12] text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Outline Toggle */}
        {hasToc && onToggleToc && (
          <button
            type="button"
            onClick={onToggleToc}
            title={isTocOpen ? "Hide Outline" : "Show Outline"}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isTocOpen
                ? "text-white bg-white/[0.1]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            }`}
          >
            <ListTree className="w-4 h-4" />
          </button>
        )}

        {/* More Actions Menu (···) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="More Actions"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isMenuOpen
                ? "text-white bg-white/[0.1]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]"
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl bg-zinc-900/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl py-1.5 z-50 text-[13px] text-zinc-200">
              {!inTauri && onNewFile && (
                <button
                  type="button"
                  onClick={() => {
                    onNewFile();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>New Document</span>
                  </span>
                </button>
              )}

              {onOpenFile && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFile();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Open File...</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">⌘O</span>
                </button>
              )}

              {!inTauri && onExportFile && (
                <button
                  type="button"
                  onClick={() => {
                    onExportFile();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export .md</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">⌘S</span>
                </button>
              )}

              {onOpenSearch && !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSearch();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2.5">
                    <Search className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Find in Document</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">⌘F</span>
                </button>
              )}

              {onChangeZoom && (
                <>
                  <div className="my-1 border-t border-white/[0.07]" />
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Zoom</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onChangeZoom(-0.1)}
                        className="p-1 rounded-md hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
                        title="Zoom Out (⌘-)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeZoom("reset")}
                        className="px-2 py-0.5 rounded-md hover:bg-white/[0.1] text-xs font-mono text-zinc-200 cursor-pointer min-w-[44px] text-center"
                        title="Reset Zoom (⌘0)"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeZoom(0.1)}
                        className="p-1 rounded-md hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
                        title="Zoom In (⌘+)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {inTauri && (
                <>
                  <div className="my-1 border-t border-white/[0.07]" />
                  {filePath && onRevealInFinder && (
                    <button
                      type="button"
                      onClick={() => {
                        onRevealInFinder(filePath);
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                    >
                      <FolderSearch className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Reveal in Finder</span>
                    </button>
                  )}
                  {filePath && (
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      <span>{copied ? "Path Copied" : "Copy File Path"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setAddressInput(filePath || "");
                      setIsAddressBarActive(true);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                  >
                    <Compass className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Go to Path...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleWindowZoom(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/[0.08] transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Toggle Fullscreen</span>
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">⌥+DblClick</span>
                  </button>
                </>
              )}

              {!inTauri && (
                <>
                  <div className="my-1 border-t border-white/[0.07]" />
                  {onOpenDownloadModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDownloadModal();
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/[0.08] text-blue-400 transition-colors cursor-pointer text-left font-medium"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Download Mac App</span>
                    </button>
                  )}
                  <a
                    href="https://github.com/rrobin0sky/online-ai-mdview"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-white/[0.08] text-zinc-300 transition-colors cursor-pointer text-left"
                  >
                    <svg className="w-3.5 h-3.5 fill-current text-zinc-400" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span>GitHub Repository</span>
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
