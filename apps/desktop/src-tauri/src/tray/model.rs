use serde::Deserialize;

const STATION_MENU_ID_PREFIX: &str = "station:";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayMenuModel {
    pub toggle: TrayToggleItem,
    pub stations: TrayStationsMenu,
    pub toggle_window: TrayLabelItem,
    pub quit: TrayLabelItem,
}

#[derive(Debug, Deserialize)]
pub struct TrayToggleItem {
    pub label: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
pub struct TrayStationsMenu {
    pub label: String,
    pub items: Vec<TrayStationEntry>,
}

#[derive(Debug, Deserialize)]
pub struct TrayStationEntry {
    pub id: String,
    pub name: String,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
pub struct TrayLabelItem {
    pub label: String,
}

pub fn station_menu_id(station_id: &str) -> String {
    format!("{STATION_MENU_ID_PREFIX}{station_id}")
}

pub fn station_id_from_menu_id(menu_id: &str) -> Option<&str> {
    menu_id.strip_prefix(STATION_MENU_ID_PREFIX)
}

#[cfg(test)]
mod tests {
    use super::*;

    const FRONTEND_MODEL: &str = r#"
    {
      "toggle": { "label": "Pausar", "enabled": true },
      "stations": {
        "label": "Emisoras",
        "items": [
          { "id": "la-quinta", "name": "La Quinta", "active": true },
          { "id": "mar-del-plata", "name": "Mar del Plata", "active": false }
        ]
      },
      "toggleWindow": { "label": "Mostrar/Ocultar" },
      "quit": { "label": "Salir" }
    }
    "#;

    #[test]
    fn deserializes_the_model_published_by_the_webview() {
        let model: TrayMenuModel =
            serde_json::from_str(FRONTEND_MODEL).expect("frontend model deserializes");

        assert_eq!(model.toggle.label, "Pausar");
        assert!(model.toggle.enabled);
        assert_eq!(model.stations.label, "Emisoras");
        assert_eq!(model.stations.items.len(), 2);
        assert_eq!(model.stations.items[0].id, "la-quinta");
        assert_eq!(model.stations.items[0].name, "La Quinta");
        assert!(model.stations.items[0].active);
        assert!(!model.stations.items[1].active);
        assert_eq!(model.toggle_window.label, "Mostrar/Ocultar");
        assert_eq!(model.quit.label, "Salir");
    }

    #[test]
    fn prefixes_station_menu_ids_to_keep_them_unique() {
        assert_eq!(station_menu_id("la-quinta"), "station:la-quinta");
    }

    #[test]
    fn reads_the_station_id_back_from_its_menu_id() {
        assert_eq!(
            station_id_from_menu_id("station:la-quinta"),
            Some("la-quinta")
        );
    }

    #[test]
    fn ignores_menu_ids_that_are_not_stations() {
        assert_eq!(station_id_from_menu_id("toggle"), None);
    }
}
