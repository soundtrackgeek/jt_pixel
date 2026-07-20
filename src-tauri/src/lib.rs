use std::path::Path;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

#[tauri::command]
fn choose_export_paths(
    window: tauri::Window,
    default_name: String,
    include_metadata: bool,
) -> Result<Option<serde_json::Value>, String> {
    let safe_default_name = Path::new(&default_name)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("jt-pixel-export.png");
    let selected = window
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Export JT Pixel artwork")
        .set_file_name(safe_default_name)
        .add_filter("PNG image", &["png"])
        .blocking_save_file();
    let Some(selected) = selected else {
        return Ok(None);
    };

    let mut image_path = selected.into_path().map_err(|error| error.to_string())?;
    if image_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_none_or(|extension| !extension.eq_ignore_ascii_case("png"))
    {
        image_path.set_extension("png");
    }

    let metadata_path = include_metadata.then(|| {
        let mut path = image_path.clone();
        path.set_extension("json");
        path
    });
    let scope = window.fs_scope();
    scope
        .allow_file(&image_path)
        .map_err(|error| error.to_string())?;
    if let Some(path) = &metadata_path {
        scope.allow_file(path).map_err(|error| error.to_string())?;
    }

    Ok(Some(serde_json::json!({
        "imagePath": image_path.to_string_lossy(),
        "metadataPath": metadata_path.map(|path| path.to_string_lossy().into_owned()),
    })))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![choose_export_paths])
        .run(tauri::generate_context!())
        .expect("error while running JT Pixel");
}
