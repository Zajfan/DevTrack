fn main() {
    // Re-embed rebuilt frontend assets even when only the web source changed.
    println!("cargo:rerun-if-changed=../devtrack-web/dist");
    tauri_build::build()
}
