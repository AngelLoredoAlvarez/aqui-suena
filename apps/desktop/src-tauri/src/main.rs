#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

fn main() -> tauri::Result<()> {
    tauri::Builder::default()
        .setup(|app| {
            tray::install(app.handle())?;
            Ok(())
        })
        // A window that closes while the tray asks to keep running is only
        // hidden: the webview stays alive and the radio keeps playing.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if tray::hides_on_close() {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
}
