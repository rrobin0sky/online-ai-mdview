import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { FileNode, FileUpdatePayload, InitialTarget } from "../types";

export const isTauriEnv = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export const sampleMarkdown = `# Welcome to mdview 🚀

An ultra-lightweight, instant-open desktop Markdown reader built with **Tauri v2**, **Rust**, and **React**.

---

## ⚡ Core Highlights

- **Cold Start < 300ms**: Extremely lightweight, no database indexing, zero bloat.
- **Double-click to Read**: Just pass \`mdview <filepath.md>\` or \`mdview <folder>\`.
- **Live Reload**: Rust \`notify\` monitors file changes on disk and hot-reloads seamlessly.
- **AI & Dev Friendly**: Gorgeous Shiki syntax highlighting with instant one-click code copy.

---

## 💻 Code Highlighting & One-Click Copy

Here is an example in Rust demonstrating the file watcher:

\`\`\`rust
use notify::{Watcher, RecursiveMode, RecommendedWatcher};
use std::time::Duration;

fn main() -> notify::Result<()> {
    let mut watcher = RecommendedWatcher::new(|res| {
        match res {
            Ok(event) => println!("File modified: {:?}", event),
            Err(e) => eprintln!("Watch error: {:?}", e),
        }
    }, notify::Config::default())?;

    watcher.watch(std::path::Path::new("README.md"), RecursiveMode::NonRecursive)?;
    println!("Watching README.md with live reload...");
    Ok(())
}
\`\`\`

And a TypeScript example:

\`\`\`typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy!", err);
    return false;
  }
}
\`\`\`

---

## 📊 GFM Table Example

| Feature | mdview | Obsidian | VS Code |
| :--- | :---: | :---: | :---: |
| **Cold Start** | **< 300ms** | ~2-4s | ~3-6s |
| **RAM Usage** | **< 50MB** | ~200MB+ | ~400MB+ |
| **Single File CLI** | **Instant** | Requires Vault | Heavy UI |
| **Live Reload** | **Native notify** | Polling/Plugin | Built-in |

---

## 📋 Task Lists

- [x] Tauri v2 + React 19 Project Skeleton
- [x] Rust File Watcher (\`notify\`) & CLI arguments
- [x] Markdown-it + Shiki rendering pipeline
- [x] Smooth TOC Scrollspy navigation
- [ ] Try opening your own local .md files!
`;

export async function fetchInitialTarget(): Promise<InitialTarget> {
  if (isTauriEnv()) {
    try {
      return await invoke<InitialTarget>("get_initial_target");
    } catch (err) {
      console.warn("Failed to get initial target from Tauri:", err);
    }
  }

  // Fallback for browser preview
  return {
    path: "/demo/welcome.md",
    is_directory: false,
    content: sampleMarkdown,
    title: "welcome.md",
  };
}

export async function readFile(path: string): Promise<string> {
  if (isTauriEnv()) {
    return await invoke<string>("read_file_content", { path });
  }
  return sampleMarkdown;
}

export async function writeFile(path: string, content: string): Promise<boolean> {
  if (isTauriEnv()) {
    try {
      await invoke("write_file_content", { path, content });
      return true;
    } catch (err) {
      console.error("Failed to write file:", err);
      throw err;
    }
  }
  // Browser Web fallback: export / download edited Markdown file
  try {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "document.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn("Failed to download file in browser:", err);
    return false;
  }
}

export async function readDirectory(path: string): Promise<FileNode[]> {
  if (isTauriEnv()) {
    return await invoke<FileNode[]>("read_directory_tree", { path });
  }
  return [
    {
      name: "welcome.md",
      path: "/demo/welcome.md",
      is_dir: false,
    },
    {
      name: "docs",
      path: "/demo/docs",
      is_dir: true,
      children: [
        {
          name: "getting-started.md",
          path: "/demo/docs/getting-started.md",
          is_dir: false,
        },
      ],
    },
  ];
}

export async function openPath(path: string): Promise<InitialTarget> {
  if (isTauriEnv()) {
    return await invoke<InitialTarget>("open_path", { path });
  }
  return {
    path,
    is_directory: false,
    content: `# Loaded ${path}\n\nMock content for browser preview.`,
    title: path.split("/").pop() || path,
  };
}

export async function renameFile(oldPath: string, newName: string): Promise<string> {
  if (isTauriEnv()) {
    return await invoke<string>("rename_file", { oldPath, newName });
  }
  const parts = oldPath.split("/");
  parts[parts.length - 1] = newName.includes(".") ? newName : `${newName}.md`;
  return parts.join("/");
}

export async function revealInFinder(path: string): Promise<void> {
  if (isTauriEnv()) {
    await invoke("reveal_in_finder", { path });
  } else {
    console.log("Mock reveal in finder:", path);
  }
}

export async function openFileDialog(): Promise<InitialTarget | null> {
  if (isTauriEnv()) {
    try {
      return await invoke<InitialTarget | null>("open_file_dialog");
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
    return null;
  }

  // Browser Web fallback: open file chooser dialog
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.mdown,.mkd,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        resolve({
          path: file.name,
          is_directory: false,
          content: text,
          title: file.name,
        });
      } catch (err) {
        console.error("Failed to read file in browser:", err);
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function openFolderDialog(): Promise<InitialTarget | null> {
  if (isTauriEnv()) {
    try {
      return await invoke<InitialTarget | null>("open_folder_dialog");
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
    }
  }
  return null;
}

export async function watchFile(path: string): Promise<void> {
  if (isTauriEnv()) {
    try {
      await invoke("watch_file", { path });
    } catch (err) {
      console.error("Failed to watch file:", err);
    }
  }
}

export async function listenFileUpdated(
  callback: (payload: FileUpdatePayload) => void
): Promise<UnlistenFn> {
  if (isTauriEnv()) {
    return await listen<FileUpdatePayload>("mdview://file-updated", (event) => {
      callback(event.payload);
    });
  }
  return () => {};
}

export async function listenTargetOpened(
  callback: (target: InitialTarget) => void
): Promise<UnlistenFn> {
  if (isTauriEnv()) {
    return await listen<InitialTarget>("mdview://open-target", (event) => {
      callback(event.payload);
    });
  }
  return () => {};
}

export async function listenDragHover(
  callback: (isHovering: boolean) => void
): Promise<UnlistenFn> {
  if (isTauriEnv()) {
    return await listen<boolean>("mdview://drag-hover", (event) => {
      callback(event.payload);
    });
  }
  return () => {};
}

