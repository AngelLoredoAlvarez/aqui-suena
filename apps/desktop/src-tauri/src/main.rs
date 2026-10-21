#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

fn main() -> tauri::Result<()> {
    tauri::Builder::default()
        .setup(|app| {
            tray::install(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
}
