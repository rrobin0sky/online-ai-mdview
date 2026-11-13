use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileUpdatePayload {
    pub path: String,
    pub content: String,
}

pub struct FileWatcherManager {
    watcher: Option<RecommendedWatcher>,
    current_path: Option<PathBuf>,
}

impl FileWatcherManager {
    pub fn new() -> Self {
        Self {
            watcher: None,
            current_path: None,
        }
    }

    pub fn watch_file(
        &mut self,
        file_path_str: &str,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let path = PathBuf::from(file_path_str);
        if !path.is_file() {
            return Err(format!("'{}' is not a file", file_path_str));
        }

        // Canonicalize path for reliable notification
        let canonical_path = fs::canonicalize(&path).unwrap_or(path.clone());

        // Stop previous watcher if already watching a file
        self.stop();

        let target_filename = canonical_path.file_name().map(|n| n.to_os_string());
        let dir_to_watch = canonical_path.parent().unwrap_or(&canonical_path).to_path_buf();
        let target_path_str = canonical_path.to_string_lossy().to_string();
        let app_clone = app_handle.clone();

        let last_trigger = Arc::new(Mutex::new(Instant::now() - Duration::from_secs(1)));
        let debounce_duration = Duration::from_millis(100);

        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    match event.kind {
                        EventKind::Modify(_) | EventKind::Create(_) => {
                            if let Some(ref target_name) = target_filename {
                                let matches_file = event.paths.iter().any(|p| {
                                    p.file_name().map(|n| n == target_name).unwrap_or(false)
                                });
                                if !matches_file {
                                    return;
                                }
                            }

                            let mut last = match last_trigger.lock() {
                                Ok(guard) => guard,
                                Err(_) => return,
                            };

                            let now = Instant::now();
                            if now.duration_since(*last) < debounce_duration {
                                return;
                            }
                            *last = now;

                            // Small delay to ensure writer finished writing
                            std::thread::sleep(Duration::from_millis(20));

                            if let Ok(content) = fs::read_to_string(&canonical_path) {
                                let payload = FileUpdatePayload {
                                    path: target_path_str.clone(),
                                    content,
                                };
                                let _ = app_clone.emit("mdview://file-updated", &payload);
                            }
                        }
                        _ => {}
                    }
                }
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create file watcher: {}", e))?;

        watcher
            .watch(&dir_to_watch, RecursiveMode::NonRecursive)
            .map_err(|e| format!("Failed to watch directory for '{}': {}", file_path_str, e))?;

        self.watcher = Some(watcher);
        self.current_path = Some(dir_to_watch);

        Ok(())
    }

    pub fn stop(&mut self) {
        if let (Some(mut watcher), Some(path)) = (self.watcher.take(), self.current_path.take()) {
            let _ = watcher.unwatch(&path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify::PollWatcher;
    use std::io::Write;
    use std::sync::mpsc::channel;

    #[test]
    fn test_notify_watcher() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("mdview_test_watch.md");
        fs::write(&test_file, "# Initial Content").unwrap();

        let (tx, rx) = channel();

        // Use PollWatcher in headless unit test where CFRunLoop is absent
        let config = Config::default().with_poll_interval(Duration::from_millis(50));
        let mut watcher = PollWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_) | EventKind::Any) {
                        let _ = tx.send(true);
                    }
                }
            },
            config,
        )
        .unwrap();

        watcher.watch(&test_file, RecursiveMode::NonRecursive).unwrap();

        // Give the watcher a moment to register baseline mtime (APFS/HFS mtime granularity)
        std::thread::sleep(Duration::from_millis(1100));

        // Modify file
        let mut f = fs::OpenOptions::new().append(true).open(&test_file).unwrap();
        writeln!(f, "\nAdded line").unwrap();
        f.flush().unwrap();

        // Wait up to 2 seconds for event
        let received = rx.recv_timeout(Duration::from_millis(2000)).is_ok();
        let _ = fs::remove_file(&test_file);

        assert!(received, "Watcher should receive file modification event");
    }
}

