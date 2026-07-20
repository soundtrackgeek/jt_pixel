use std::path::PathBuf;
use tauri_plugin_fs::FsExt;

#[tauri::command]
fn prepare_export_paths(
    window: tauri::Window,
    image_path: String,
    include_metadata: bool,
) -> Result<serde_json::Value, String> {
    let (image_path, metadata_path) = normalized_export_paths(&image_path, include_metadata)?;
    let scope = window.fs_scope();
    scope
        .allow_file(&image_path)
        .map_err(|error| error.to_string())?;
    if let Some(path) = &metadata_path {
        scope.allow_file(path).map_err(|error| error.to_string())?;
    }

    Ok(serde_json::json!({
        "imagePath": image_path.to_string_lossy(),
        "metadataPath": metadata_path.map(|path| path.to_string_lossy().into_owned()),
    }))
}

fn normalized_export_paths(
    requested_path: &str,
    include_metadata: bool,
) -> Result<(PathBuf, Option<PathBuf>), String> {
    let mut image_path = PathBuf::from(requested_path);
    if image_path
        .file_name()
        .and_then(|name| name.to_str())
        .is_none_or(|name| name.is_empty())
    {
        return Err("Choose a file name for the PNG export.".to_string());
    }
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
    Ok((image_path, metadata_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![prepare_export_paths])
        .run(tauri::generate_context!())
        .expect("error while running JT Pixel");
}

#[cfg(test)]
mod tests {
    use super::normalized_export_paths;
    use std::path::PathBuf;

    #[test]
    fn prepares_png_and_sibling_metadata_paths() {
        let (image, metadata) = normalized_export_paths("exports/walk", true).unwrap();

        assert_eq!(image, PathBuf::from("exports/walk.png"));
        assert_eq!(metadata, Some(PathBuf::from("exports/walk.json")));
    }

    #[test]
    fn replaces_a_non_png_extension_without_metadata() {
        let (image, metadata) = normalized_export_paths("exports/walk.jpeg", false).unwrap();

        assert_eq!(image, PathBuf::from("exports/walk.png"));
        assert_eq!(metadata, None);
    }
}
