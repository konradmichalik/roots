use std::fs;
use std::io;
use std::path::Path;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use tauri::{AppHandle, Manager};

const EXPORT_FILE_NAME: &str = "data.json";
const EXPORT_TMP_FILE_NAME: &str = "data.json.tmp";

fn write_atomically(dir: &Path, contents: &str) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    let tmp_path = dir.join(EXPORT_TMP_FILE_NAME);
    let target_path = dir.join(EXPORT_FILE_NAME);

    fs::write(&tmp_path, contents)?;

    #[cfg(unix)]
    fs::set_permissions(&tmp_path, fs::Permissions::from_mode(0o600))?;

    fs::rename(&tmp_path, &target_path)
}

fn delete_if_exists(dir: &Path) -> io::Result<()> {
    match fs::remove_file(dir.join(EXPORT_FILE_NAME)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e)
    }
}

#[tauri::command]
pub fn write_export_file(app: AppHandle, contents: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    write_atomically(&dir, &contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_export_file(app: AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    delete_if_exists(&dir).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("roots-export-test-{}-{}", label, std::process::id()))
    }

    #[test]
    fn writes_file_atomically_with_expected_contents() {
        let dir = temp_dir("write");
        write_atomically(&dir, "{\"a\":1}").unwrap();

        let target = dir.join(EXPORT_FILE_NAME);
        assert!(target.exists());
        assert!(!dir.join(EXPORT_TMP_FILE_NAME).exists());
        assert_eq!(fs::read_to_string(&target).unwrap(), "{\"a\":1}");

        fs::remove_dir_all(&dir).ok();
    }

    #[cfg(unix)]
    #[test]
    fn sets_0600_permissions_on_unix() {
        let dir = temp_dir("perms");
        write_atomically(&dir, "{}").unwrap();

        let mode = fs::metadata(dir.join(EXPORT_FILE_NAME)).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_is_a_noop_when_file_is_missing() {
        let dir = temp_dir("missing");
        fs::create_dir_all(&dir).unwrap();

        assert!(delete_if_exists(&dir).is_ok());

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn delete_removes_an_existing_file() {
        let dir = temp_dir("delete");
        write_atomically(&dir, "{}").unwrap();
        assert!(dir.join(EXPORT_FILE_NAME).exists());

        delete_if_exists(&dir).unwrap();
        assert!(!dir.join(EXPORT_FILE_NAME).exists());

        fs::remove_dir_all(&dir).ok();
    }
}
