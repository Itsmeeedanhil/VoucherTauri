pub mod amount_to_words;
pub mod db;
pub mod models;
pub mod quickbooks;

use db::DbState;
use models::{ClientProfile, SeriesConfig, SignatoriesConfig, VoucherData};
use tauri::{Manager, State};

#[tauri::command]
fn get_clients(db: State<'_, DbState>) -> Result<Vec<ClientProfile>, String> {
    db.get_all_clients().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_client_profile(db: State<'_, DbState>, profile: ClientProfile) -> Result<(), String> {
    db.save_client(&profile).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_series(
    db: State<'_, DbState>,
    client_code: String,
    form_type: String,
) -> Result<SeriesConfig, String> {
    db.get_series(&client_code, &form_type)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_series(db: State<'_, DbState>, config: SeriesConfig) -> Result<(), String> {
    db.update_series(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn increment_series(
    db: State<'_, DbState>,
    client_code: String,
    form_type: String,
) -> Result<SeriesConfig, String> {
    let mut cfg = db
        .get_series(&client_code, &form_type)
        .map_err(|e| e.to_string())?;
    cfg.current_number += 1;
    db.update_series(&cfg).map_err(|e| e.to_string())?;
    Ok(cfg)
}

#[tauri::command]
fn get_signatories(
    db: State<'_, DbState>,
    client_code: String,
) -> Result<SignatoriesConfig, String> {
    db.get_signatories(&client_code).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_signatories(db: State<'_, DbState>, config: SignatoriesConfig) -> Result<(), String> {
    db.save_signatories(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn query_quickbooks_voucher(
    db: State<'_, DbState>,
    form_type: String,
    client_code: String,
    company_name: String,
    ref_number: String,
) -> Result<VoucherData, String> {
    let series_key = if company_name.trim().is_empty() {
        &client_code
    } else {
        &company_name
    };
    let series = db
        .get_series(series_key, &form_type)
        .map_err(|e| e.to_string())?;
    let sig = db
        .get_signatories(&client_code)
        .map_err(|e| e.to_string())?;

    let formatted_series = if series.prefix.is_empty() {
        format!(
            "{:0width$}",
            series.current_number,
            width = series.digit_count as usize
        )
    } else {
        format!(
            "{}{:0width$}",
            series.prefix,
            series.current_number,
            width = series.digit_count as usize
        )
    };

    quickbooks::query_voucher_from_qb(
        &form_type,
        &client_code,
        &company_name,
        &ref_number,
        &formatted_series,
        sig,
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app: &mut tauri::App| {
            let app_dir = app
                .handle()
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap());
            let db_path = app_dir.join("voucherpro_bradwell.db");
            let state = DbState::new(db_path).expect("Failed to initialize SQLite database");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_clients,
            save_client_profile,
            get_series,
            update_series,
            increment_series,
            get_signatories,
            save_signatories,
            query_quickbooks_voucher
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
