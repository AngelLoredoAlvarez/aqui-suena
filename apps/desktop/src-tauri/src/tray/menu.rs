use tauri::{
    menu::{CheckMenuItem, Menu, MenuBuilder, MenuEvent, MenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Listener, Manager, Wry,
};

use std::sync::atomic::{AtomicBool, Ordering};

use super::diagnostics;
use super::model::{parse_model, station_id_from_menu_id, station_menu_id, TrayMenuModel};

pub const TRAY_ID: &str = "main-tray";
pub const MENU_EVENT: &str = "tray-menu";
pub const TOGGLE_EVENT: &str = "tray-toggle";
pub const SELECT_STATION_EVENT: &str = "tray-select-station";
pub const TOGGLE_CLOSE_TO_TRAY_EVENT: &str = "tray-toggle-close-to-tray";

const WINDOW_LABEL: &str = "main";
const MENU_SHOW: &str = "show";
const MENU_PLAY_PAUSE: &str = "play-pause";
const MENU_CLOSE_TO_TRAY: &str = "close-to-tray";
const MENU_WINDOW: &str = "window";
const MENU_QUIT: &str = "quit";

// The product name. It is a brand string, not translated copy, so the fallback
// ribbon is the one label Rust may own.
const FALLBACK_LABEL: &str = "Aquí Suena";

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../../icons/32x32.png"))
        .expect("tray icon missing: apps/desktop/src-tauri/icons/32x32.png");

    // The Linux AppIndicator backend never publishes the item until a menu is
    // set, and this fallback is also the floor under a webview that never
    // publishes: one item that restores the window, so a broken bridge leaves a
    // usable tray instead of a dead icon. The first published model replaces it.
    let fallback_item = MenuItem::with_id(app, MENU_SHOW, FALLBACK_LABEL, true, None::<&str>)?;
    let fallback_menu = MenuBuilder::new(app).item(&fallback_item).build()?;

    TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Aquí Suena")
        .icon(icon)
        .menu(&fallback_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(on_tray_icon_event)
        .build(app)?;

    let handle = app.clone();
    app.listen(MENU_EVENT, move |event| {
        let model = match parse_model(event.payload()) {
            Ok(model) => model,
            Err(error) => {
                report(
                    &handle,
                    &format!("ignoring malformed {MENU_EVENT} payload: {error}"),
                );
                return;
            }
        };

        let Some(tray) = handle.tray_by_id(TRAY_ID) else {
            return;
        };

        match build_menu(&handle, &model) {
            Ok(menu) => match tray.set_menu(Some(menu)) {
                Ok(()) => store_close_to_tray(model.close_to_tray.checked),
                Err(error) => report(&handle, &format!("failed to replace tray menu: {error}")),
            },
            Err(error) => report(&handle, &format!("failed to build tray menu: {error}")),
        }
    });

    Ok(())
}

fn report(app: &AppHandle, message: &str) {
    eprintln!("{message}");

    if let Ok(directory) = app.path().app_log_dir() {
        diagnostics::record(&directory, message);
    }
}

fn build_menu(app: &AppHandle, model: &TrayMenuModel) -> tauri::Result<Menu<Wry>> {
    let toggle = MenuItem::with_id(
        app,
        MENU_PLAY_PAUSE,
        &model.toggle.label,
        model.toggle.enabled,
        None::<&str>,
    )?;

    let mut stations = SubmenuBuilder::new(app, &model.stations.label);
    for station in &model.stations.items {
        let entry = CheckMenuItem::with_id(
            app,
            station_menu_id(&station.id),
            &station.name,
            true,
            station.active,
            None::<&str>,
        )?;
        stations = stations.item(&entry);
    }
    let stations = stations.build()?;

    let close_to_tray = CheckMenuItem::with_id(
        app,
        MENU_CLOSE_TO_TRAY,
        &model.close_to_tray.label,
        true,
        model.close_to_tray.checked,
        None::<&str>,
    )?;

    let toggle_window = MenuItem::with_id(
        app,
        MENU_WINDOW,
        &model.toggle_window.label,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MENU_QUIT, &model.quit.label, true, None::<&str>)?;

    MenuBuilder::new(app)
        .item(&toggle)
        .item(&stations)
        .separator()
        .item(&close_to_tray)
        .item(&toggle_window)
        .separator()
        .item(&quit)
        .build()
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    let menu_id = event.id.as_ref();

    match menu_id {
        MENU_SHOW => show_window(app),
        MENU_PLAY_PAUSE => {
            let _ = app.emit(TOGGLE_EVENT, ());
        }
        MENU_CLOSE_TO_TRAY => {
            let _ = app.emit(TOGGLE_CLOSE_TO_TRAY_EVENT, ());
        }
        MENU_WINDOW => toggle_window_visibility(app),
        MENU_QUIT => app.exit(0),
        _ => {
            if let Some(station_id) = station_id_from_menu_id(menu_id) {
                let _ = app.emit(SELECT_STATION_EVENT, station_id.to_string());
            }
        }
    }
}

// The webview owns the preference; this is only the last value it published, so
// the close handler can answer without a round trip. Until a model arrives the
// flag stays false, which makes closing a window behave like a normal app.
static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(false);

fn store_close_to_tray(value: bool) {
    CLOSE_TO_TRAY.store(value, Ordering::Relaxed);
}

pub fn hides_on_close() -> bool {
    CLOSE_TO_TRAY.load(Ordering::Relaxed)
}

fn toggle_window_visibility(app: &AppHandle) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };

    let _ = match window.is_visible() {
        Ok(true) => window.hide(),
        _ => window.show().and_then(|()| window.set_focus()),
    };
}

fn show_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn on_tray_icon_event(tray: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        show_window(tray.app_handle());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // The wire contract lives in two languages. This test is the only thing
    // that fails when one side renames a channel and the other does not.
    const WEB_BRIDGE: &str = include_str!("../../../../../apps/web/app/tray-bridge.ts");

    #[test]
    fn the_close_behaviour_follows_the_last_published_model() {
        store_close_to_tray(true);
        assert!(
            hides_on_close(),
            "a checked close-to-tray item must hide the window instead of exiting"
        );

        store_close_to_tray(false);
        assert!(
            !hides_on_close(),
            "an unchecked close-to-tray item must let the window close exit"
        );
    }

    #[test]
    fn event_channels_match_the_web_bridge() {
        let mut declared: Vec<&str> = WEB_BRIDGE
            .lines()
            .filter_map(|line| {
                let (_, rest) = line.trim().split_once("_EVENT = \"")?;
                rest.split_once('"').map(|(value, _)| value)
            })
            .collect();
        declared.sort_unstable();

        let mut rust = vec![
            MENU_EVENT,
            TOGGLE_EVENT,
            SELECT_STATION_EVENT,
            TOGGLE_CLOSE_TO_TRAY_EVENT,
        ];
        rust.sort_unstable();

        assert_eq!(
            declared, rust,
            "the web bridge and the Rust tray must declare the same event channels"
        );
    }
}
