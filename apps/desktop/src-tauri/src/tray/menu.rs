use tauri::{
    menu::{CheckMenuItem, Menu, MenuBuilder, MenuEvent, MenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Listener, Manager, Wry,
};

use super::model::{station_id_from_menu_id, station_menu_id, TrayMenuModel};

pub const TRAY_ID: &str = "main-tray";
pub const MENU_EVENT: &str = "tray-menu";
pub const TOGGLE_EVENT: &str = "tray-toggle";
pub const SELECT_STATION_EVENT: &str = "tray-select-station";

const WINDOW_LABEL: &str = "main";
const MENU_TOGGLE: &str = "toggle";
const MENU_TOGGLE_WINDOW: &str = "toggle-window";
const MENU_QUIT: &str = "quit";

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let icon = tauri::image::Image::from_bytes(include_bytes!("../../icons/32x32.png"))
        .expect("tray icon missing: apps/desktop/src-tauri/icons/32x32.png");

    // The Linux AppIndicator backend never publishes the item until a menu is
    // set; an empty one is enough and the first published model replaces it.
    let empty_menu = Menu::new(app)?;

    TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Aqui Suena")
        .icon(icon)
        .menu(&empty_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(on_tray_icon_event)
        .build(app)?;

    let handle = app.clone();
    app.listen(MENU_EVENT, move |event| {
        let model: TrayMenuModel = match serde_json::from_str(event.payload()) {
            Ok(model) => model,
            Err(error) => {
                eprintln!("ignoring malformed {MENU_EVENT} payload: {error}");
                return;
            }
        };

        let Some(tray) = handle.tray_by_id(TRAY_ID) else {
            return;
        };

        match build_menu(&handle, &model) {
            Ok(menu) => {
                if let Err(error) = tray.set_menu(Some(menu)) {
                    eprintln!("failed to replace tray menu: {error}");
                }
            }
            Err(error) => eprintln!("failed to build tray menu: {error}"),
        }
    });

    Ok(())
}

fn build_menu(app: &AppHandle, model: &TrayMenuModel) -> tauri::Result<Menu<Wry>> {
    let toggle = MenuItem::with_id(
        app,
        MENU_TOGGLE,
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

    let toggle_window = MenuItem::with_id(
        app,
        MENU_TOGGLE_WINDOW,
        &model.toggle_window.label,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MENU_QUIT, &model.quit.label, true, None::<&str>)?;

    MenuBuilder::new(app)
        .item(&toggle)
        .item(&stations)
        .separator()
        .item(&toggle_window)
        .separator()
        .item(&quit)
        .build()
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    let menu_id = event.id.as_ref();

    match menu_id {
        MENU_TOGGLE => {
            let _ = app.emit(TOGGLE_EVENT, ());
        }
        MENU_TOGGLE_WINDOW => toggle_window(app),
        MENU_QUIT => app.exit(0),
        _ => {
            if let Some(station_id) = station_id_from_menu_id(menu_id) {
                let _ = app.emit(SELECT_STATION_EVENT, station_id.to_string());
            }
        }
    }
}

fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };

    let _ = match window.is_visible() {
        Ok(true) => window.hide(),
        _ => window.show().and_then(|()| window.set_focus()),
    };
}

fn on_tray_icon_event(tray: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        if let Some(window) = tray.app_handle().get_webview_window(WINDOW_LABEL) {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
