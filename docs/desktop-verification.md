# Desktop verification

`Desktop Verification` runs on pull requests, relevant pushes to `main`, and
manual dispatches. It tests the checked-out commit. It neither updates draft
release assets nor publishes a release. Standard GitHub-hosted runners let a
Linux maintainer collect Windows and macOS evidence without owning those systems.

## Native workflow checks

The matrix uses Ubuntu 22.04, Windows Server 2022, macOS 15 Apple Silicon and
macOS 15 Intel. `scripts/test-desktop-workflows.py` drives the actual native
webview and Rust backend through WebDriver. It checks:

- Migration of a database predating task versions and paused timers, preserving
  task descriptions, completion, priorities, due dates, subtasks, time entries
  and Markdown notes. The input schema is a fixed independent SQL fixture.
- Bundled frontend startup; invalid path validation and project creation.
- README rendering, file preview and local Git history from a real repository.
- Task creation, version editing, completion and the global task view.
- Saving Unicode Markdown notes.
- Persistence across two complete process exits and launches.
- Moving a repository and saving its new location through the project editor.

These use synthetic DOM input/click events. They do not certify native keyboard
input, folder pickers, system menus, tray behavior, notifications or shortcuts.
The existing Linux `scripts/test-desktop.py` contains native picker/keyboard
checks, but is separate from this suite.

## Test build isolation

`desktop-test` is an optional Cargo feature. It includes the embedded WebDriver
dependency and requires an absolute `DEVTRACK_TEST_DATA_DIR` before startup.
Without that variable the test executable exits rather than using normal user
data. Its Tauri identifier is derived from the fixture path under
`com.devtrack.verification`, separating its settings from the regular application
and other test runs. Test webviews use incognito storage, including on macOS
where an app identifier alone does not isolate WebKit storage. Restart checks
cover SQLite and note files, not browser storage. The runner always creates a
new fixture directory; a requested artifact directory must not already exist.

Normal builds omit the feature and the WebDriver dependency. Never publish or
distribute a binary built with `desktop-test`.

Local reproduction:

```sh
npm ci
npm run build --workspace devtrack-web
cargo build -p devtrack-desktop --features desktop-test --locked
# Linux needs a display; omit xvfb-run on macOS and Windows.
xvfb-run -a python3 scripts/test-desktop-workflows.py target/debug/devtrack-desktop
```

On Windows the binary is `target/debug/devtrack-desktop.exe`. Python uses only
its standard library; Git must be on PATH. No GitHub login or live repository
access is needed. Logs, screenshots, fixture data and `result.json` are written
under the printed temporary directory, or the new directory passed with
`--artifacts`.

## Production package checks

Separate jobs build normal release packages without `desktop-test` from the same
checkout. Windows installs an MSI, checks for a visible application window and
ten seconds of continued execution, then uninstalls it. macOS mounts the DMG,
copies the application out, verifies its CPU architecture and checks that it
remains running for ten seconds. Both capture desktop screenshots and logs.
CI uploads workflow and package evidence separately, including on failure.

Package smoke scripts also remain usable by the draft release workflow. Evidence
is tied to each Actions run and its commit; a pass on an older draft does not
verify the latest source.

## Remaining release checks

- NSIS EXE installation and real old-version-to-new-version installer upgrades,
  with user data retained. Database schema migration alone is not an installer
  upgrade test.
- Windows 10/11 consumer installations; Windows Server CI is useful evidence but
  does not cover every supported desktop environment.
- First-download SmartScreen/Gatekeeper prompts, interactive permissions,
  keyboard shortcuts, native dialogs, tray and other desktop integration.
- Visual review of the saved screenshots and hands-on usability checks.

Keep those gaps explicit in issues #3 and #4. Adding or passing this workflow
does not by itself make the complete 1.0 release ready.
