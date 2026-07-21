use std::path::PathBuf;
use tauri_plugin_fs::FsExt;

#[cfg(target_os = "windows")]
mod screen_picker;

#[tauri::command]
fn prepare_export_paths(
    window: tauri::Window,
    image_path: String,
    format: String,
    include_metadata: bool,
) -> Result<serde_json::Value, String> {
    let (image_path, metadata_path) =
        normalized_export_paths(&image_path, &format, include_metadata)?;
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

#[tauri::command]
fn allow_import_path(window: tauri::Window, path: String) -> Result<String, String> {
    const MAX_IMPORT_FILE_BYTES: u64 = 64 * 1024 * 1024;
    let requested = PathBuf::from(path);
    let extension_is_png = requested
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("png"));
    if !extension_is_png {
        return Err("JT Pixel currently imports PNG images only.".to_string());
    }
    let metadata = std::fs::metadata(&requested)
        .map_err(|error| format!("The PNG image could not be accessed: {error}"))?;
    if !metadata.is_file() {
        return Err("Choose a PNG image file.".to_string());
    }
    if metadata.len() > MAX_IMPORT_FILE_BYTES {
        return Err("Choose a PNG smaller than 64 MB.".to_string());
    }
    let canonical = requested
        .canonicalize()
        .map_err(|error| format!("The PNG image path could not be resolved: {error}"))?;
    window
        .fs_scope()
        .allow_file(&canonical)
        .map_err(|error| error.to_string())?;
    Ok(canonical.to_string_lossy().into_owned())
}

fn normalized_export_paths(
    requested_path: &str,
    format: &str,
    include_metadata: bool,
) -> Result<(PathBuf, Option<PathBuf>), String> {
    let extension = match format {
        "gif" => "gif",
        "png" => "png",
        _ => return Err("JT Pixel only exports PNG and GIF artwork.".to_string()),
    };
    let mut image_path = PathBuf::from(requested_path);
    if image_path
        .file_name()
        .and_then(|name| name.to_str())
        .is_none_or(|name| name.is_empty())
    {
        return Err("Choose a file name for the artwork export.".to_string());
    }
    if image_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_none_or(|current| !current.eq_ignore_ascii_case(extension))
    {
        image_path.set_extension(extension);
    }

    let metadata_path = (include_metadata && format == "png").then(|| {
        let mut path = image_path.clone();
        path.set_extension("json");
        path
    });
    Ok((image_path, metadata_path))
}

#[tauri::command]
async fn start_screen_picker(window: tauri::Window) -> Result<Option<serde_json::Value>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
        return Err("The system-wide screen picker is currently available on Windows.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        window.hide().map_err(|error| error.to_string())?;
        let picker_task =
            tauri::async_runtime::spawn_blocking(screen_picker::pick_screen_color).await;
        let show_result = window.show().map_err(|error| error.to_string());
        let focus_result = window.set_focus().map_err(|error| error.to_string());
        show_result?;
        focus_result?;

        let picker_result = picker_task
            .map_err(|error| format!("The screen picker stopped unexpectedly: {error}"))?;

        picker_result.map(|picked| {
            picked.map(|picked| {
                serde_json::json!({
                    "color": picked.color,
                    "role": picked.role,
                    "x": picked.x,
                    "y": picked.y,
                })
            })
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            prepare_export_paths,
            allow_import_path,
            start_screen_picker
        ])
        .run(tauri::generate_context!())
        .expect("error while running JT Pixel");
}

#[cfg(test)]
mod tests {
    use super::normalized_export_paths;
    use std::path::PathBuf;

    #[test]
    fn prepares_png_and_sibling_metadata_paths() {
        let (image, metadata) = normalized_export_paths("exports/walk", "png", true).unwrap();

        assert_eq!(image, PathBuf::from("exports/walk.png"));
        assert_eq!(metadata, Some(PathBuf::from("exports/walk.json")));
    }

    #[test]
    fn replaces_a_non_png_extension_without_metadata() {
        let (image, metadata) = normalized_export_paths("exports/walk.jpeg", "png", false).unwrap();

        assert_eq!(image, PathBuf::from("exports/walk.png"));
        assert_eq!(metadata, None);
    }

    #[test]
    fn prepares_gif_paths_without_png_metadata() {
        let (image, metadata) = normalized_export_paths("exports/walk.png", "gif", true).unwrap();

        assert_eq!(image, PathBuf::from("exports/walk.gif"));
        assert_eq!(metadata, None);
    }
}
