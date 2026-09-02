mod export;
mod settings_file;

use tauri::Manager;

#[tauri::command]
async fn http_post_form(url: String, body: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if status >= 400 {
        return Err(text);
    }

    Ok(text)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Runs before the frontend first loads the store, so the mode is in place from the
            // very first save. See settings_file for why doing it once is enough.
            if let Ok(dir) = app.path().app_data_dir() {
                if let Err(e) = settings_file::restrict_settings_file(&dir) {
                    eprintln!("Failed to restrict settings.json permissions: {e}");
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            http_post_form,
            export::write_export_file,
            export::delete_export_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
