#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

fn main() -> tauri::Result<()> {
    tauri::Builder::default()
        .setup(|app| {
            let toggle = MenuItem::with_id(app, "toggle", "Mostrar/Ocultar", true, None::<&str>)?;
            let play_pause =
                MenuItem::with_id(app, "play-pause", "Reproducir/Pausar", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = MenuBuilder::new(app)
                .item(&toggle)
                .item(&play_pause)
                .item(&quit)
                .build()?;

            // Placeholder icon until the final 1024px brand asset lands.
            let icon = tauri::image::Image::from_bytes(include_bytes!(
                "../../../web/app/favicon.ico"
            ))
            .expect("tray icon placeholder missing: apps/web/app/favicon.ico");

            TrayIconBuilder::new()
                .tooltip("Aqui Suena")
                .icon(icon)
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = match window.is_visible() {
                                Ok(true) => window.hide(),
                                _ => window.show().and_then(|()| window.set_focus()),
                            };
                        }
                    }
                    "play-pause" => {
                        let _ = app.emit("tray-play-pause", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
}
