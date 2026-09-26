use devtrack_core::Config;
use rusqlite::Connection as SqliteConnection;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct AppState {
    pub config: Config,
    pub db: Arc<Mutex<SqliteConnection>>,
    pub active_timer: Arc<Mutex<Option<(i64, i64)>>>, // (task_id, start_time)
}

impl AppState {
    pub fn new() -> anyhow::Result<Self> {
        let config = Config::new()?;
        let conn = devtrack_core::init_db(&config)?;
        Ok(Self {
            config,
            db: Arc::new(Mutex::new(conn)),
            active_timer: Arc::new(Mutex::new(None)),
        })
    }
}

pub fn now_ts() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}

impl AppState {
    pub fn start_timer(&self, task_id: i64) -> anyhow::Result<i64> {
        let conn = self.db.lock().unwrap();
        let start = devtrack_core::queries::start_timer(&conn, task_id)?;
        *self.active_timer.lock().unwrap() = Some((task_id, start));
        Ok(start)
    }

    pub fn stop_timer(&self, task_id: i64) -> anyhow::Result<Option<i64>> {
        let conn = self.db.lock().unwrap();
        let duration = devtrack_core::queries::stop_timer(&conn, task_id)?;
        if let Some((active_id, _)) = *self.active_timer.lock().unwrap() {
            if active_id == task_id {
                *self.active_timer.lock().unwrap() = None;
            }
        }
        Ok(duration)
    }

    pub fn get_active_timer(&self) -> Option<(i64, i64)> {
        *self.active_timer.lock().unwrap()
    }
}