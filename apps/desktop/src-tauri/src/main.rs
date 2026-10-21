#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

use tauri::Manager;

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
                if !tray::hides_on_close() {
                    return;
                }

                // Prevent the close only once the window is really hidden. A
                // failed hide that had already cancelled the close would leave
                // a window the user cannot dismiss, with the tray as the only
                // way out.
                match window.hide() {
                    Ok(()) => api.prevent_close(),
                    Err(error) => tray::report(
                        window.app_handle(),
                        &format!("failed to hide the window on close: {error}"),
                    ),
                }
            }
        })
        .run(tauri::generate_context!())
}
