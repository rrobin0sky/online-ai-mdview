use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Window;

#[derive(Serialize, Deserialize, Default, Clone, Debug)]
pub struct WindowState {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub is_maximized: bool,
}

fn get_state_file_path() -> Option<PathBuf> {
    if let Ok(home) = std::env::var("HOME") {
        let dir = PathBuf::from(home).join(".config").join("mdview");
        let _ = fs::create_dir_all(&dir);
        Some(dir.join("window-state.json"))
    } else {
        None
    }
}

pub fn restore_window_state(window: &Window) {
    if let Some(path) = get_state_file_path() {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(state) = serde_json::from_str::<WindowState>(&content) {
                // Restore dimensions
                if state.width >= 500.0 && state.height >= 400.0 {
                    let _ = window.set_size(tauri::LogicalSize::new(state.width, state.height));
                }
                // Restore position (ensuring y >= 0 on macOS to keep titlebar accessible)
                if let (Some(x), Some(y)) = (state.x, state.y) {
                    if y >= 0.0 {
                        let _ = window.set_position(tauri::LogicalPosition::new(x, y));
                    }
                }
                // Restore maximized state
                if state.is_maximized {
                    let _ = window.maximize();
                }
            }
        }
    }
}

pub fn save_window_state(window: &Window) {
    let is_maximized = window.is_maximized().unwrap_or(false);

    // If maximized, update the maximized flag but preserve previous normal dimensions
    if is_maximized {
        if let Some(path) = get_state_file_path() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(mut state) = serde_json::from_str::<WindowState>(&content) {
                    state.is_maximized = true;
                    if let Ok(json) = serde_json::to_string_pretty(&state) {
                        let _ = fs::write(&path, json);
                    }
                    return;
                }
            }
        }
    }

    if let (Ok(factor), Ok(size), Ok(pos)) = (
        window.scale_factor(),
        window.outer_size(),
        window.outer_position(),
    ) {
        let logical_size = size.to_logical::<f64>(factor);
        let logical_pos = pos.to_logical::<f64>(factor);

        let state = WindowState {
            width: logical_size.width,
            height: logical_size.height,
            x: Some(logical_pos.x),
            y: Some(logical_pos.y),
            is_maximized: false,
        };

        if let Some(path) = get_state_file_path() {
            if let Ok(json) = serde_json::to_string_pretty(&state) {
                let _ = fs::write(path, json);
            }
        }
    }
}

