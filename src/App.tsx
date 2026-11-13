import React, { useEffect, useState, useCallback, useRef } from "react";
import { HeaderBar } from "./components/HeaderBar";
import { FileSidebar } from "./components/FileSidebar";
import { MarkdownViewer } from "./components/MarkdownViewer";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { TableOfContents } from "./components/TableOfContents";
import { SearchBar } from "./components/SearchBar";
import { DocumentErrorBoundary } from "./components/DocumentErrorBoundary";
import { UploadCloud, ListTree, ArrowUp } from "lucide-react";
import {
  fetchInitialTarget,
  isTauriEnv,
  listenDragHover,
  listenFileUpdated,
  listenTargetOpened,
  openFileDialog,
  openPath,
  readDirectory,
  readFile,
  renameFile,
  revealInFinder,
  watchFile,
  writeFile,
} from "./lib/tauri-bridge";
import { FileNode, TocItem, ThemeMode } from "./types";

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("mdview");
  const [content, setContent] = useState<string>("");
  const [isDirectoryMode, setIsDirectoryMode] = useState<boolean>(false);
  const [directoryFiles, setDirectoryFiles] = useState<FileNode[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(true);
  const [isDragHovering, setIsDragHovering] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Edit mode & Split view state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const lastSavedTimeRef = useRef<number>(0);

  // Sync content with preview: 150ms debounced when editing to ensure 120fps smooth typing, immediate when reading
  useEffect(() => {
    if (!isEditing) {
      setPreviewContent(content);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setPreviewContent(content);
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [content, isEditing]);

  // Binary Dark/Light theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("mdview-theme");
    return saved === "light" ? "light" : "dark";
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      const root = document.documentElement;
      if (next === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem("mdview-theme", next);
      return next;
    });
  }, []);

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Zoom level state with localStorage persistence
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    const saved = localStorage.getItem("mdview_zoom_level");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.5) return parsed;
    }
    return 1.0;
  });
  const [showZoomPill, setShowZoomPill] = useState<boolean>(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const changeZoom = useCallback((delta: number | "reset") => {
    setZoomLevel((prev) => {
      let next: number;
      if (delta === "reset") {
        next = 1.0;
      } else {
        next = Math.round((prev + delta) * 10) / 10;
        next = Math.min(2.0, Math.max(0.6, next));
      }
      localStorage.setItem("mdview_zoom_level", next.toString());
      return next;
    });

    setShowZoomPill(true);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      setShowZoomPill(false);
    }, 1200);
  }, []);

  // Track content editing
  const handleContentChange = useCallback((newVal: string) => {
    setContent(newVal);
    setIsDirty(true);
  }, []);

  // Save document to disk (Cmd+S)
  const handleSave = useCallback(async () => {
    if (!currentPath) return;
    try {
      lastSavedContentRef.current = content;
      lastSavedTimeRef.current = Date.now();
      await writeFile(currentPath, content);
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [currentPath, content]);

  // Helper to open file via native file dialog (Cmd+O)
  const handleOpenFile = useCallback(async () => {
    const target = await openFileDialog();
    if (target && target.path) {
      setIsDirectoryMode(false);
      setIsSidebarOpen(false);
      setCurrentPath(target.path);
      setFileName(target.title);
      setContent(target.content || "");
      setIsDirty(false);
      await watchFile(target.path);
    }
  }, []);

  // Global Keyboard shortcut listener (Cmd + / Cmd - / Cmd 0 / Cmd F / Cmd O / Cmd S / Cmd E / Cmd P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          changeZoom(0.1);
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          changeZoom(-0.1);
        } else if (e.key === "0") {
          e.preventDefault();
          changeZoom("reset");
        } else if (key === "f") {
          e.preventDefault();
          setIsSearchOpen((prev) => !prev);
        } else if (key === "o") {
          e.preventDefault();
          handleOpenFile();
        } else if (key === "s") {
          e.preventDefault();
          handleSave();
        } else if (key === "e") {
          e.preventDefault();
          setIsEditing((prev) => !prev);
        } else if (key === "p") {
          e.preventDefault();
          setIsEditing(true);
          setIsSplitView((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeZoom, handleOpenFile, handleSave]);

  // Track scroll position of the reader container to show/hide Back to Top button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 300) {
      if (!showBackToTop) setShowBackToTop(true);
    } else {
      if (showBackToTop) setShowBackToTop(false);
    }
  };

  // Helper to find the first readable markdown file in a directory tree
  const findFirstMarkdownFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (!node.is_dir && node.name.toLowerCase().startsWith("readme")) {
        return node;
      }
    }
    for (const node of nodes) {
      if (!node.is_dir) return node;
      if (node.children) {
        const found = findFirstMarkdownFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Switch to a new markdown file
  const handleSelectFile = useCallback(async (filePath: string, name: string) => {
    try {
      const newContent = await readFile(filePath);
      setCurrentPath(filePath);
      setFileName(name);
      setContent(newContent);
      setIsDirty(false);
      await watchFile(filePath);
    } catch (err) {
      console.error("Failed to read selected file:", err);
    }
  }, []);

  // Jump/navigate to path directly from Address Bar
  const handleOpenPath = useCallback(
    async (targetPath: string) => {
      try {
        const target = await openPath(targetPath);
        if (target.is_directory && target.path) {
          setIsDirectoryMode(true);
          setIsSidebarOpen(true);
          const tree = await readDirectory(target.path);
          setDirectoryFiles(tree);
          const first = findFirstMarkdownFile(tree);
          if (first) {
            await handleSelectFile(first.path, first.name);
          } else {
            setFileName(target.title);
            setContent(`# 📁 ${target.title}\n\n*No Markdown documents found in this directory.*`);
          }
        } else if (target.path) {
          setIsDirectoryMode(false);
          setIsSidebarOpen(false);
          setCurrentPath(target.path);
          setFileName(target.title);
          setContent(target.content || "");
          setIsDirty(false);
          await watchFile(target.path);
        }
      } catch (err) {
        console.error("Failed to open path:", err);
        alert(`Cannot open path: ${err}`);
      }
    },
    [handleSelectFile]
  );

  // Rename current file in place
  const handleRenameFile = useCallback(
    async (newName: string) => {
      if (!currentPath) return;
      try {
        const newPath = await renameFile(currentPath, newName);
        const newTitle = newPath.split("/").pop() || newName;
        setCurrentPath(newPath);
        setFileName(newTitle);
        await watchFile(newPath);
      } catch (err) {
        console.error("Failed to rename file:", err);
        alert(`Failed to rename file: ${err}`);
      }
    },
    [currentPath]
  );

  // Reveal file in macOS Finder
  const handleRevealInFinder = useCallback(async (path: string) => {
    try {
      await revealInFinder(path);
    } catch (err) {
      console.error("Failed to reveal in Finder:", err);
    }
  }, []);

  // Initialize app from CLI args or default
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let unlistenOpened: (() => void) | undefined;
    let unlistenDrag: (() => void) | undefined;

    const init = async () => {
      const target = await fetchInitialTarget();

      if (target.is_directory && target.path) {
        setIsDirectoryMode(true);
        setIsSidebarOpen(true);
        try {
          const tree = await readDirectory(target.path);
          setDirectoryFiles(tree);

          const firstFile = findFirstMarkdownFile(tree);
          if (firstFile) {
            await handleSelectFile(firstFile.path, firstFile.name);
          } else {
            setFileName(target.title);
            setContent(`# 📁 ${target.title}\n\n*No Markdown documents found in this directory.*`);
          }
        } catch (err) {
          console.error("Failed to read directory tree:", err);
        }
      } else if (target.path) {
        setIsDirectoryMode(false);
        setIsSidebarOpen(false);
        setCurrentPath(target.path);
        setFileName(target.title);
        setContent(target.content || "");
        await watchFile(target.path);
      } else {
        // Empty default state
        setContent(target.content || "");
        setFileName(target.title);
      }

      // Register file watcher listener for Live Reload
      unlisten = await listenFileUpdated((payload) => {
        // Ignore file update events triggered by our own save within 1.5 seconds or matching content
        if (
          payload.content === lastSavedContentRef.current ||
          Date.now() - lastSavedTimeRef.current < 1500
        ) {
          return;
        }
        setContent(payload.content);
        setIsDirty(false);
      });

      // Register listener for drag-and-drop hover feedback
      unlistenDrag = await listenDragHover((isHovering) => {
        setIsDragHovering(isHovering);
      });

      // Register listener when opened from Finder / macOS Open With / Drag & Drop
      unlistenOpened = await listenTargetOpened(async (openedTarget) => {
        if (openedTarget.is_directory && openedTarget.path) {
          setIsDirectoryMode(true);
          setIsSidebarOpen(true);
          const tree = await readDirectory(openedTarget.path);
          setDirectoryFiles(tree);
          const first = findFirstMarkdownFile(tree);
          if (first) await handleSelectFile(first.path, first.name);
        } else if (openedTarget.path) {
          setIsDirectoryMode(false);
          setIsSidebarOpen(false);
          setCurrentPath(openedTarget.path);
          setFileName(openedTarget.title);
          setContent(openedTarget.content || "");
          await watchFile(openedTarget.path);
        }
      });
    };

    init();

    return () => {
      if (unlisten) unlisten();
      if (unlistenOpened) unlistenOpened();
      if (unlistenDrag) unlistenDrag();
    };
  }, [handleSelectFile]);

  // Web browser HTML5 drag & drop support
  useEffect(() => {
    if (isTauriEnv()) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragHovering(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsDragHovering(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragHovering(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          setCurrentPath(file.name);
          setFileName(file.name);
          setContent(text);
          setIsDirty(false);
          setIsDirectoryMode(false);
          setIsSidebarOpen(false);
        } catch (err) {
          console.error("Failed to read dropped file:", err);
        }
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden select-none">
      <HeaderBar
        filePath={currentPath}
        fileName={fileName}
        isDirectoryMode={isDirectoryMode}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        hasToc={tocItems.length > 0}
        isTocOpen={isTocOpen}
        onToggleToc={() => setIsTocOpen(!isTocOpen)}
        zoomLevel={zoomLevel}
        onResetZoom={() => changeZoom("reset")}
        onOpenFile={handleOpenFile}
        onOpenSearch={() => setIsSearchOpen((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((prev) => !prev)}
        isSplitView={isSplitView}
        onToggleSplitView={() => setIsSplitView((prev) => !prev)}
        isDirty={isDirty}
        onSave={handleSave}
        onOpenPath={handleOpenPath}
        onRenameFile={handleRenameFile}
        onRevealInFinder={handleRevealInFinder}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden relative w-full">
        {/* Drag and Drop visual overlay */}
        {isDragHovering && (
          <div className="absolute inset-0 z-50 bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-xs border-2 border-dashed border-blue-500 flex flex-col items-center justify-center pointer-events-none transition-all">
            <div className="bg-white/95 dark:bg-zinc-900/95 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border border-zinc-200/80 dark:border-zinc-800/80">
              <UploadCloud className="w-10 h-10 text-blue-500 animate-bounce" />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Drop Markdown file or folder here to open
              </p>
            </div>
          </div>
        )}

        {/* Floating Zoom Level Pill Feedback */}
        {showZoomPill && (
          <div className="fixed bottom-6 right-72 z-50 px-3.5 py-1.5 rounded-full bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 text-xs font-mono font-semibold shadow-xl backdrop-blur select-none pointer-events-none transition-all animate-in fade-in duration-150">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        )}

        {/* Left: Directory File Tree Sidebar (when opened in directory mode) */}
        {isDirectoryMode && isSidebarOpen && (
          <FileSidebar
            files={directoryFiles}
            activeFilePath={currentPath}
            onSelectFile={handleSelectFile}
          />
        )}

        {/* Center: Reading Area or Code Editor */}
        {isEditing ? (
          isSplitView ? (
            /* Split View: Left Editor, Right Live Rendered Preview */
            <div className="flex-1 h-full min-h-0 min-w-0 flex overflow-hidden">
              <div className="w-1/2 h-full min-h-0 border-r border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden flex flex-col">
                <DocumentErrorBoundary fallbackTitle="Editor Notice">
                  <MarkdownEditor
                    value={content}
                    onChange={handleContentChange}
                    isDark={theme === "dark"}
                    onSave={handleSave}
                  />
                </DocumentErrorBoundary>
              </div>

              <div
                id="reader-container"
                ref={readerContainerRef}
                onScroll={handleScroll}
                className="w-1/2 h-full min-h-0 overflow-y-auto relative select-text bg-white dark:bg-zinc-950"
              >
                <div className="w-full px-6 sm:px-8 py-6" style={{ zoom: zoomLevel }}>
                  <DocumentErrorBoundary
                    fallbackTitle="Preview Render Notice"
                    onSwitchToEdit={() => setIsSplitView(false)}
                  >
                    <MarkdownViewer
                      content={previewContent}
                      onTocChange={setTocItems}
                      isDark={theme === "dark"}
                    />
                  </DocumentErrorBoundary>
                </div>
              </div>
            </div>
          ) : (
            /* Single Column Editor View */
            <div className="flex-1 h-full min-h-0 min-w-0 overflow-hidden flex flex-col">
              <DocumentErrorBoundary fallbackTitle="Editor Notice">
                <MarkdownEditor
                  value={content}
                  onChange={handleContentChange}
                  isDark={theme === "dark"}
                  onSave={handleSave}
                />
              </DocumentErrorBoundary>
            </div>
          )
        ) : (
          /* Pure Reading View */
          <div
            id="reader-container"
            ref={readerContainerRef}
            onScroll={handleScroll}
            className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto relative select-text"
          >
            {/* Floating In-Document Search Bar (Cmd+F) */}
            <SearchBar
              containerRef={readerContainerRef}
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />

            {/* Central Article Content Container - Apple HIG Optimal Reading Measure (~860px) */}
            <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 py-8 transition-all">
              <div style={{ zoom: zoomLevel }}>
                <DocumentErrorBoundary
                  fallbackTitle="Document Display Notice"
                  onSwitchToEdit={() => setIsEditing(true)}
                >
                  <MarkdownViewer
                    content={previewContent}
                    onTocChange={setTocItems}
                    isDark={theme === "dark"}
                  />
                </DocumentErrorBoundary>
              </div>
            </div>

            {/* Back to Top Floating Button */}
            {showBackToTop && (
              <button
                type="button"
                onClick={() => readerContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                title="Back to Top"
                className="sticky bottom-6 float-right mr-6 z-30 p-2.5 rounded-full bg-white/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 shadow-lg text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Right: Fixed Docked Outline Pane (Streamlined, minimal visual noise) */}
        {tocItems.length > 0 && isTocOpen && (
          <aside className="w-64 flex-shrink-0 h-full border-l border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/20 dark:bg-zinc-950/20 backdrop-blur-xs flex flex-col overflow-hidden select-none">
            <div className="px-3.5 py-2.5 border-b border-zinc-200/30 dark:border-zinc-800/30 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <ListTree className="w-3.5 h-3.5 text-blue-500" />
              <span>Outline</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
              <TableOfContents items={tocItems} containerId="reader-container" />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default App;
