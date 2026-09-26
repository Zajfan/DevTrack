use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub username: String,
    pub email: String,
    pub default_project_path: String,
    pub auto_start_timer: bool,
    pub theme: String,
    pub compact_mode: bool,
    pub sidebar_collapsed: bool,
    pub desktop_notifications: bool,
    pub timer_complete_sound: bool,
    pub daily_summary_email: bool,
    pub sync_enabled: bool,
    pub sync_provider: String,
    pub sync_url: String,
    pub api_port: u16,
    pub debug_mode: bool,
    pub telemetry_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            username: "developer".to_string(),
            email: "dev@example.com".to_string(),
            default_project_path: ".".to_string(),
            auto_start_timer: false,
            theme: "system".to_string(),
            compact_mode: false,
            sidebar_collapsed: false,
            desktop_notifications: true,
            timer_complete_sound: true,
            daily_summary_email: false,
            sync_enabled: false,
            sync_provider: "webdav".to_string(),
            sync_url: "".to_string(),
            api_port: 8080,
            debug_mode: false,
            telemetry_enabled: true,
        }
    }
}

const STORE_KEY: &str = "settings";

pub fn get_settings<R: Runtime>(app: &AppHandle<R>) -> Result<Settings, String> {
    let store = app.store(STORE_KEY).map_err(|e| e.to_string())?;
    let value = store.get(STORE_KEY).map(|v| v.clone()).unwrap_or_else(|| serde_json::json!({}));
    let settings: Settings = serde_json::from_value(value).unwrap_or_default();
    Ok(settings)
}

pub fn set_settings<R: Runtime>(app: &AppHandle<R>, settings: Settings) -> Result<(), String> {
    let store = app.store(STORE_KEY).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(settings).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, value);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}