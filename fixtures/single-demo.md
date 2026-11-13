# Local Markdown Viewer (mdview)

A blazing-fast, single-purpose desktop Markdown reader designed for engineers and AI workflows.

> [!NOTE]
> Engineered with **Tauri v2** and **Rust** for native cold-start (< 300ms) and minimal RAM footprint (< 50MB).

---

## 🚀 Key Advantages

### 1. Zero Configuration
No workspaces to set up, no local SQLite databases to migrate, and no heavy indexing process. Simply run:

```bash
# View a single file
mdview path/to/document.md

# Browse a folder of markdown notes
mdview ./docs
```

### 2. High-Performance File Watching
When an external tool or AI agent modifies your file, `mdview` instantly hot-reloads without UI stutter:

```rust
use notify::{Watcher, RecursiveMode, RecommendedWatcher};
use std::path::Path;

pub fn start_watch<P: AsRef<Path>>(target: P) -> notify::Result<()> {
    let mut watcher = RecommendedWatcher::new(|res| {
        if let Ok(event) = res {
            println!("FS Event received: {:?}", event.kind);
        }
    }, notify::Config::default())?;

    watcher.watch(target.as_ref(), RecursiveMode::NonRecursive)?;
    Ok(())
}
```

---

## 🛠️ Performance Benchmark

| Tool | Cold Start | Memory (Idle) | Tech Stack |
| :--- | :---: | :---: | :---: |
| **mdview** | **~210 ms** | **~38 MB** | Tauri v2 + Rust |
| **VS Code** | ~3,200 ms | ~450 MB | Electron |
| **Obsidian** | ~2,400 ms | ~280 MB | Electron + SQLite |
| **MarkText** | ~1,800 ms | ~210 MB | Electron |

---

## 📋 Roadmap & Task Tracker

- [x] Lightweight Tauri v2 foundation
- [x] Shiki syntax highlighting with Dual Themes (GitHub Light & Dark)
- [x] One-click code copy button with visual status feedback
- [x] IntersectionObserver based TOC Scrollspy
- [x] CLI arguments dispatcher: `mdview <file>` vs `mdview <dir>`
- [ ] Export to clean PDF / Printable HTML

---

## 💡 AI Code Review Sample

Here is a quick Python script showing how an AI agent pipes generated notes to `mdview`:

```python
import subprocess
from pathlib import Path

def preview_note(markdown_text: str, filename: str = "ai_output.md"):
    output_path = Path("/tmp") / filename
    output_path.write_text(markdown_text, encoding="utf-8")
    
    # Launch mdview instantly
    subprocess.Popen(["mdview", str(output_path)])
    print(f"Opened {output_path} in mdview.")

if __name__ == "__main__":
    preview_note("# AI Generated Summary\n\n- Analysis complete.\n- 0 errors found.")
```

End of document.
