//! Only compiled into explicitly requested desktop-test builds.
use devtrack_core::Config;
use std::path::PathBuf;

pub fn config_from_path(path: Option<PathBuf>) -> anyhow::Result<Config> {
    let data_dir = path.ok_or_else(|| anyhow::anyhow!("DEVTRACK_TEST_DATA_DIR is required"))?;
    anyhow::ensure!(data_dir.is_absolute(), "DEVTRACK_TEST_DATA_DIR must be absolute");
    let notes_dir = data_dir.join("notes");
    std::fs::create_dir_all(&notes_dir)?;
    Ok(Config {
        db_path: data_dir.join("projects.db"),
        notes_dir,
        data_dir,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn automation_requires_an_explicit_absolute_data_directory() {
        assert!(config_from_path(None).is_err());
        assert!(config_from_path(Some(PathBuf::from("relative"))).is_err());
    }
}
