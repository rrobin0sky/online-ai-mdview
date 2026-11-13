use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialTarget {
    pub path: Option<String>,
    pub is_directory: bool,
    pub content: Option<String>,
    pub title: String,
}

impl Default for InitialTarget {
    fn default() -> Self {
        Self {
            path: None,
            is_directory: false,
            content: None,
            title: "mdview".to_string(),
        }
    }
}

pub fn parse_cli_target() -> InitialTarget {
    let args: Vec<String> = env::args().collect();
    // Find the first argument that doesn't start with '-' or '--' (skip args[0] which is binary)
    let candidate = args.iter().skip(1).find(|arg| !arg.starts_with('-'));

    if let Some(arg) = candidate {
        let path = PathBuf::from(arg);
        let resolved = if path.is_absolute() {
            path
        } else {
            env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join(path)
        };

        if let Ok(canonical) = fs::canonicalize(&resolved) {
            return process_path(&canonical);
        } else if resolved.exists() {
            return process_path(&resolved);
        }
    }

    InitialTarget::default()
}

fn process_path(path: &Path) -> InitialTarget {
    let path_str = path.to_string_lossy().to_string();
    if path.is_dir() {
        let folder_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Directory".to_string());
        InitialTarget {
            path: Some(path_str),
            is_directory: true,
            content: None,
            title: folder_name,
        }
    } else {
        let file_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Markdown Document".to_string());
        let content = fs::read_to_string(path).ok();
        InitialTarget {
            path: Some(path_str),
            is_directory: false,
            content,
            title: file_name,
        }
    }
}

pub fn resolve_path_target(path_str: &str) -> Option<InitialTarget> {
    let trimmed = path_str.trim();
    let expanded = if trimmed.starts_with("~/") || trimmed == "~" {
        if let Ok(home) = env::var("HOME") {
            if trimmed == "~" {
                home
            } else {
                format!("{}{}", home, &trimmed[1..])
            }
        } else {
            trimmed.to_string()
        }
    } else {
        trimmed.to_string()
    };

    let path = PathBuf::from(&expanded);
    let resolved = if path.is_absolute() {
        path
    } else {
        env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join(path)
    };

    if let Ok(canonical) = fs::canonicalize(&resolved) {
        Some(process_path(&canonical))
    } else if resolved.exists() {
        Some(process_path(&resolved))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_file() {
        let target = resolve_path_target("../fixtures/single-demo.md");
        assert!(target.is_some());
        let target = target.unwrap();
        assert!(!target.is_directory);
        assert!(target.content.is_some());
        assert_eq!(target.title, "single-demo.md");
    }

    #[test]
    fn test_resolve_directory() {
        let target = resolve_path_target("../fixtures");
        assert!(target.is_some());
        let target = target.unwrap();
        assert!(target.is_directory);
        assert_eq!(target.title, "fixtures");
    }
}

