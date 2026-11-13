use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

pub fn read_file_content(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

pub fn write_file_content(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

pub fn rename_file(old_path: &str, new_name: &str) -> Result<String, String> {
    let old_p = Path::new(old_path);
    if !old_p.exists() {
        return Err(format!("Source file '{}' does not exist", old_path));
    }

    let parent = old_p
        .parent()
        .ok_or_else(|| "File has no parent directory".to_string())?;

    let trimmed_name = new_name.trim();
    if trimmed_name.is_empty() {
        return Err("New filename cannot be empty".to_string());
    }

    // Defensive check: prevent path traversal attacks or directory escapes
    if trimmed_name.contains('/') || trimmed_name.contains('\\') || trimmed_name.contains("..") {
        return Err("Filename cannot contain path separators ('/', '\\') or '..' sequence".to_string());
    }

    // Preserve original extension if user omitted it
    let final_name = if !trimmed_name.contains('.') {
        if let Some(ext) = old_p.extension().and_then(|e| e.to_str()) {
            format!("{}.{}", trimmed_name, ext)
        } else {
            trimmed_name.to_string()
        }
    } else {
        trimmed_name.to_string()
    };

    // Guarantee that final_name is strictly a single file component
    let final_path = Path::new(&final_name);
    if final_path.components().count() != 1 {
        return Err("Invalid filename structure".to_string());
    }

    let new_p = parent.join(&final_name);
    fs::rename(old_p, &new_p).map_err(|e| format!("Failed to rename file: {}", e))?;

    Ok(new_p.to_string_lossy().to_string())
}

pub fn reveal_in_finder(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open Finder: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Ok(())
    }
}

fn is_markdown_file(path: &Path) -> bool {
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        matches!(
            ext.to_lowercase().as_str(),
            "md" | "markdown" | "mdown" | "mkdn" | "mdx"
        )
    } else {
        false
    }
}

pub fn build_file_tree(dir: &Path) -> Result<Vec<FileNode>, String> {
    if !dir.is_dir() {
        return Err(format!("'{}' is not a directory", dir.display()));
    }

    let mut nodes = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/directories (e.g., .git, .DS_Store, .vscode)
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        if path.is_dir() {
            // Recursively inspect subdirectories
            if let Ok(children) = build_file_tree(&path) {
                // Only include directory if it contains markdown files or non-empty subdirectories
                if !children.is_empty() {
                    nodes.push(FileNode {
                        name,
                        path: path.to_string_lossy().to_string(),
                        is_dir: true,
                        children: Some(children),
                    });
                }
            }
        } else if is_markdown_file(&path) {
            nodes.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: None,
            });
        }
    }

    // Sort: directories first, then files alphabetically
    nodes.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(nodes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_file_tree() {
        let tree = build_file_tree(Path::new("../fixtures")).expect("Should scan fixtures dir");
        assert!(!tree.is_empty());
        let has_readme = tree.iter().any(|node| node.name == "README.md");
        let has_docs = tree.iter().any(|node| node.name == "docs" && node.is_dir);
        assert!(has_readme);
        assert!(has_docs);
    }

    #[test]
    fn test_rename_file() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("mdview_test_rename_src.md");
        fs::write(&test_file, "# Test").expect("create test file");

        // Rename without extension -> should keep .md
        let renamed = rename_file(
            test_file.to_str().unwrap(),
            "mdview_test_rename_target",
        ).expect("rename file");
        assert!(renamed.ends_with("mdview_test_rename_target.md"));
        assert!(Path::new(&renamed).exists());
        assert!(!test_file.exists());

        // Test path traversal defense
        let traversal_result = rename_file(
            &renamed,
            "../../malicious_escape",
        );
        assert!(traversal_result.is_err(), "Path traversal must be rejected");

        // Cleanup
        let _ = fs::remove_file(renamed);
    }
}

