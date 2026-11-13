pub mod cli;
pub mod fs_service;
pub mod watcher;
pub mod window_state;

use cli::InitialTarget;
use fs_service::FileNode;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use watcher::FileWatcherManager;

pub struct AppState {
    pub initial_target: Mutex<InitialTarget>,
    pub watcher: Mutex<FileWatcherManager>,
}

#[tauri::command]
fn get_initial_target(state: State<AppState>) -> Result<InitialTarget, String> {
    let target = state
        .initial_target
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    Ok(target)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs_service::read_file_content(&path)
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs_service::write_file_content(&path, &content)
}

#[tauri::command]
fn read_directory_tree(path: String) -> Result<Vec<FileNode>, String> {
    let p = Path::new(&path);
    fs_service::build_file_tree(p)
}

#[tauri::command]
fn watch_file(path: String, app_handle: AppHandle, state: State<AppState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    watcher_guard.watch_file(&path, app_handle)
}

#[tauri::command]
fn unwatch_file(state: State<AppState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    watcher_guard.stop();
    Ok(())
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<InitialTarget>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown & Text", &["md", "markdown", "mdown", "mkdn", "txt"])
        .pick_file();

    if let Some(path) = file {
        let path_str = path.to_string_lossy().to_string();
        if let Some(target) = cli::resolve_path_target(&path_str) {
            return Ok(Some(target));
        }
    }
    Ok(None)
}

#[tauri::command]
fn open_folder_dialog() -> Result<Option<InitialTarget>, String> {
    let folder = rfd::FileDialog::new().pick_folder();
    if let Some(path) = folder {
        let path_str = path.to_string_lossy().to_string();
        if let Some(target) = cli::resolve_path_target(&path_str) {
            return Ok(Some(target));
        }
    }
    Ok(None)
}

#[tauri::command]
fn open_path(path: String) -> Result<InitialTarget, String> {
    if let Some(target) = cli::resolve_path_target(&path) {
        Ok(target)
    } else {
        Err(format!("Path '{}' does not exist or is not readable", path))
    }
}

#[tauri::command]
fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    fs_service::rename_file(&old_path, &new_name)
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    fs_service::reveal_in_finder(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_target = cli::parse_cli_target();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            initial_target: Mutex::new(initial_target),
            watcher: Mutex::new(FileWatcherManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_initial_target,
            read_file_content,
            write_file_content,
            read_directory_tree,
            watch_file,
            unwatch_file,
            open_file_dialog,
            open_folder_dialog,
            open_path,
            rename_file,
            reveal_in_finder
        ])
        .setup(|app| {
            // Restore saved window size & position
            if let Some(webview_window) = app.get_webview_window("main") {
                window_state::restore_window_state(&webview_window.as_ref().window());
            }

            // If the initial target was a file, start watching it immediately
            let state = app.state::<AppState>();
            if let Ok(guard) = state.initial_target.lock() {
                if let Some(ref path) = guard.path {
                    if !guard.is_directory {
                        if let Ok(mut watcher_guard) = state.watcher.lock() {
                            let _ = watcher_guard.watch_file(path, app.handle().clone());
                        }
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                // Save window state cleanly on exit without high-frequency disk I/O thrashing during resizing
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    window_state::save_window_state(window);
                }
                tauri::WindowEvent::DragDrop(drag_drop_event) => {
                    use tauri::Emitter;
                    match drag_drop_event {
                        tauri::DragDropEvent::Enter { .. } | tauri::DragDropEvent::Over { .. } => {
                            let _ = window.emit("mdview://drag-hover", true);
                        }
                        tauri::DragDropEvent::Leave => {
                            let _ = window.emit("mdview://drag-hover", false);
                        }
                        tauri::DragDropEvent::Drop { paths, .. } => {
                            let _ = window.emit("mdview://drag-hover", false);
                            if let Some(first_path) = paths.first() {
                                let path_str = first_path.to_string_lossy().to_string();
                                if let Some(target) = cli::resolve_path_target(&path_str) {
                                    let app_handle = window.app_handle();
                                    let state = app_handle.state::<AppState>();
                                    if let Ok(mut guard) = state.initial_target.lock() {
                                        *guard = target.clone();
                                    }
                                    if let Some(ref p) = target.path {
                                        if !target.is_directory {
                                            if let Ok(mut watcher_guard) = state.watcher.lock() {
                                                let _ = watcher_guard.watch_file(p, app_handle.clone());
                                            }
                                        }
                                    }
                                    let _ = window.emit("mdview://open-target", &target);
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building mdview application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                use tauri::Emitter;
                for url in urls {
                    if let Ok(file_path) = url.to_file_path() {
                        let path_str = file_path.to_string_lossy().to_string();
                        if let Some(target) = cli::resolve_path_target(&path_str) {
                            let state = app_handle.state::<AppState>();
                            if let Ok(mut guard) = state.initial_target.lock() {
                                *guard = target.clone();
                            }
                            if let Some(ref p) = target.path {
                                if !target.is_directory {
                                    if let Ok(mut watcher_guard) = state.watcher.lock() {
                                        let _ = watcher_guard.watch_file(p, app_handle.clone());
                                    }
                                }
                            }
                            let _ = app_handle.emit("mdview://open-target", &target);
                        }
                    }
                }
            }
        });
}
