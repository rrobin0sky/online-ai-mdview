import React, { useState, useRef, useEffect } from "react";
import {
  PanelLeft,
  FileText,
  ListTree,
  FolderOpen,
  Search,
  PenLine,
  Eye,
  Columns,
  Save,
  Copy,
  Check,
  FolderSearch,
  ArrowRight,
  X,
  Pencil,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeMode } from "../types";
import { isTauriEnv } from "../lib/tauri-bridge";

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
  onResetZoom?: () => void;
  onOpenFile?: () => void;
  onOpenSearch?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
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
  onResetZoom,
  onOpenFile,
  onOpenSearch,
  theme,
  onToggleTheme,
  isEditing,
  onToggleEdit,
  isSplitView,
  onToggleSplitView,
  isDirty,
  onSave,
  onOpenPath,
  onRenameFile,
  onRevealInFinder,
}) => {
  // Address Bar State
  const [isAddressBarActive, setIsAddressBarActive] = useState<boolean>(false);
  const [addressInput, setAddressInput] = useState<string>("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Renaming State
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Copy Feedback State
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enter Address Bar Mode
  const handleStartAddressBar = () => {
    if (!filePath) return;
    setAddressInput(filePath);
    setIsAddressBarActive(true);
  };

  useEffect(() => {
    if (isAddressBarActive && addressInputRef.current) {
      addressInputRef.current.focus();
      addressInputRef.current.select();
    }
  }, [isAddressBarActive]);

  // Submit Address Bar
  const handleAddressSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = addressInput.trim();
    if (trimmed && onOpenPath) {
      onOpenPath(trimmed);
    }
    setIsAddressBarActive(false);
  };

  // Cancel Address Bar
  const handleAddressCancel = () => {
    setIsAddressBarActive(false);
  };

  // Start Renaming
  const handleStartRename = () => {
    setRenameInput(fileName);
    setIsRenaming(true);
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select filename without extension if present
      const dotIndex = fileName.lastIndexOf(".");
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [isRenaming, fileName]);

  // Submit Rename
  const handleRenameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = renameInput.trim();
    if (trimmed && trimmed !== fileName && onRenameFile) {
      onRenameFile(trimmed);
    }
    setIsRenaming(false);
  };

  // Copy Path to Clipboard
  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="sticky top-0 z-30 h-10 w-full border-b border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between pl-[76px] pr-4 select-none"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-4"
      >
        {isDirectoryMode && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Hide File Explorer" : "Show File Explorer"}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {isAddressBarActive ? (
          /* Address Bar Mode: Full path input with quick jump */
          <form
            onSubmit={handleAddressSubmit}
            className="flex-1 flex items-center gap-1.5 min-w-0 max-w-2xl animate-in fade-in duration-100"
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
                    handleAddressCancel();
                  }
                }}
                onBlur={() => {
                  // Small delay to allow click on submit button
                  setTimeout(() => {
                    setIsAddressBarActive(false);
                  }, 150);
                }}
                placeholder="Enter file or folder path (e.g. ~/Documents/note.md)..."
                className="w-full h-7 pl-2.5 pr-7 rounded-md text-xs font-mono bg-zinc-100/90 dark:bg-zinc-900/90 border border-blue-500 text-zinc-900 dark:text-zinc-100 outline-none shadow-xs select-text"
              />
              <button
                type="button"
                onClick={handleAddressCancel}
                title="Cancel (Esc)"
                className="absolute right-1.5 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="submit"
              title="Navigate to Path (Enter)"
              className="h-7 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <span>Go</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        ) : (
          /* Normal Display Mode: Title & Path & Quick Actions */
          <div
            data-tauri-drag-region
            className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 truncate min-w-0"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />

            {/* Filename with inline renaming */}
            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="inline-flex items-center gap-1">
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
                  className="h-6 px-1.5 rounded text-xs font-semibold bg-white dark:bg-zinc-900 border border-blue-500 text-zinc-900 dark:text-zinc-100 outline-none select-text shadow-xs"
                />
              </form>
            ) : (
              <div
                className="group/name flex items-center gap-1 cursor-pointer"
                onDoubleClick={handleStartRename}
                title="Double-click to rename file"
              >
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {fileName || "Untitled"}
                </span>
                {isDirty && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse flex-shrink-0"
                    title="Unsaved changes (Cmd+S to save)"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename();
                  }}
                  title="Rename file"
                  className="opacity-0 group-hover/name:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Full Path & Interactive Hover Actions */}
            {filePath && (
              <div className="group/path flex items-center gap-1 min-w-0">
                <button
                  type="button"
                  onClick={handleStartAddressBar}
                  title="Click to view full path or jump to path"
                  className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-1.5 py-0.5 rounded transition-colors truncate max-w-sm lg:max-w-xl text-left cursor-pointer"
                >
                  ({filePath})
                </button>

                {/* Quick Copy Path Button */}
                <button
                  type="button"
                  onClick={handleCopyPath}
                  title={copied ? "Full path copied!" : "Copy full absolute path"}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-500 font-sans font-medium">Copied!</span>
                    </>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                {/* Quick Reveal in Finder Button */}
                {onRevealInFinder && (
                  <button
                    type="button"
                    onClick={() => onRevealInFinder(filePath)}
                    title="Reveal in Finder (macOS)"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer flex-shrink-0"
                  >
                    <FolderSearch className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Save button (when editing and dirty) */}
        {isEditing && isDirty && onSave && (
          <button
            type="button"
            onClick={onSave}
            title="Save Document (Cmd+S)"
            className="p-1.5 rounded-md text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Split View button (only available in edit mode) */}
        {isEditing && (
          <button
            type="button"
            onClick={onToggleSplitView}
            title={isSplitView ? "Single Editor Mode (Cmd+P)" : "Split View Mode (Cmd+P)"}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isSplitView
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Edit / Reading Mode Toggle */}
        <button
          type="button"
          onClick={onToggleEdit}
          title={isEditing ? "Switch to Reading Mode (Cmd+E)" : "Switch to Edit Mode (Cmd+E)"}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isEditing
              ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
        </button>

        {onOpenFile && (
          <button
            type="button"
            onClick={onOpenFile}
            title="Open Markdown File (Cmd+O)"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenSearch && !isEditing && (
          <button
            type="button"
            onClick={onOpenSearch}
            title="Find in Document (Cmd+F)"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        {zoomLevel !== 1.0 && onResetZoom && (
          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom to 100% (Cmd+0)"
            className="px-2 py-0.5 rounded text-[11px] font-mono text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        )}

        {hasToc && onToggleToc && (
          <button
            type="button"
            onClick={onToggleToc}
            title={isTocOpen ? "Hide Outline" : "Show Outline"}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isTocOpen
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
          </button>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        {!isTauriEnv() && (
          <a
            href="https://github.com/rrobin0sky/online-ai-mdview"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub Repository"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        )}
      </div>
    </header>
  );
};
