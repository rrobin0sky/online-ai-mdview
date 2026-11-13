import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";
import { FileNode } from "../types";

interface FileSidebarProps {
  files: FileNode[];
  activeFilePath: string | null;
  onSelectFile: (filePath: string, fileName: string) => void;
}

interface TreeNodeProps {
  node: FileNode;
  activeFilePath: string | null;
  onSelectFile: (filePath: string, fileName: string) => void;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  activeFilePath,
  onSelectFile,
  level,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.is_dir) {
    return (
      <div>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          className="flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer select-none group"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeFilePath === node.path;

  return (
    <div
      onClick={() => onSelectFile(node.path, node.name)}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
      className={`flex items-center gap-1.5 py-1 px-2 my-0.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
    >
      <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-blue-500" : "text-zinc-400"}`} />
      <span className="truncate">{node.name}</span>
    </div>
  );
};

export const FileSidebar: React.FC<FileSidebarProps> = ({
  files,
  activeFilePath,
  onSelectFile,
}) => {
  const [search, setSearch] = useState("");

  const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.is_dir) {
        const filteredChildren = node.children ? filterNodes(node.children, query) : [];
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(query)) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else if (node.name.toLowerCase().includes(query)) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return filterNodes(files, q);
  }, [files, search]);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col h-[calc(100vh-3rem)]">
      <div className="p-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search markdown files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-400 dark:text-zinc-500">
            No Markdown files found
          </div>
        ) : (
          filteredFiles.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              level={0}
            />
          ))
        )}
      </div>
    </aside>
  );
};
