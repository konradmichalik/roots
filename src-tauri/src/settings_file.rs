#[cfg(unix)]
use std::fs;
use std::io;
#[cfg(unix)]
use std::io::Write;
#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::Path;

const SETTINGS_FILE_NAME: &str = "settings.json";

// tauri-plugin-store creates settings.json under the process umask, which lands at 0644 on a
// default setup and leaves the stored service credentials readable by every other local account.
// The plugin saves via fs::write, which truncates an existing file and preserves its mode, so
// setting 0600 once before the store is first loaded also covers every later save.
#[cfg(unix)]
pub fn restrict_settings_file(dir: &Path) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    let path = dir.join(SETTINGS_FILE_NAME);

    // create_new so the mode applies from creation, with no window where the file exists under
    // the umask's more permissive default. An empty object keeps the plugin's initial load valid.
    match fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&path)
    {
        Ok(mut file) => file.write_all(b"{}"),
        Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600))
        }
        Err(e) => Err(e),
    }
}

#[cfg(not(unix))]
pub fn restrict_settings_file(_dir: &Path) -> io::Result<()> {
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn temp_dir(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "roots-settings-test-{}-{}",
            label,
            std::process::id()
        ))
    }

    fn mode_of(path: &Path) -> u32 {
        fs::metadata(path).unwrap().permissions().mode() & 0o777
    }

    #[test]
    fn creates_a_missing_settings_file_at_0600() {
        let dir = temp_dir("create");
        restrict_settings_file(&dir).unwrap();

        let path = dir.join(SETTINGS_FILE_NAME);
        assert_eq!(mode_of(&path), 0o600);
        assert_eq!(fs::read_to_string(&path).unwrap(), "{}");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn tightens_an_existing_world_readable_file_without_touching_its_contents() {
        let dir = temp_dir("tighten");
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(SETTINGS_FILE_NAME);
        fs::write(&path, "{\"roots:theme\":\"dark\"}").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();

        restrict_settings_file(&dir).unwrap();

        assert_eq!(mode_of(&path), 0o600);
        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            "{\"roots:theme\":\"dark\"}"
        );

        fs::remove_dir_all(&dir).ok();
    }
}
