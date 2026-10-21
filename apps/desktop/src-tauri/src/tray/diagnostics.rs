use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub const LOG_FILE: &str = "tray.log";

// A packaged GUI build has no terminal, so stderr alone leaves tray failures
// undiagnosable. Every record lands in the app log directory as one timestamped
// line; a failed write is swallowed because reporting a report failure would
// only add noise to a path that is already degraded.
pub fn record(directory: &Path, message: &str) {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis())
        .unwrap_or_default();
    let line = format!("[{stamp}] {message}\n");

    let _ = fs::create_dir_all(directory);
    let _ = OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join(LOG_FILE))
        .and_then(|mut file| file.write_all(line.as_bytes()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn appends_every_failure_as_its_own_line() {
        let directory = std::env::temp_dir().join(format!(
            "aqui-suena-tray-log-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|elapsed| elapsed.as_nanos())
                .unwrap_or_default()
        ));

        record(&directory, "first failure");
        record(&directory, "second failure");

        let written = fs::read_to_string(directory.join(LOG_FILE)).expect("log file is written");
        let lines: Vec<&str> = written.lines().collect();

        assert_eq!(lines.len(), 2);
        assert!(lines[0].ends_with(" first failure"), "{}", lines[0]);
        assert!(lines[1].ends_with(" second failure"), "{}", lines[1]);
        assert!(lines[0].starts_with('['), "{}", lines[0]);

        let _ = fs::remove_dir_all(&directory);
    }
}
