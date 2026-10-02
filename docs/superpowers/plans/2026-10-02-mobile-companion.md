# Mobile companion implementation plan

**Goal:** Ship a tested offline Android companion alongside desktop draft artifacts, keeping native iOS and HarmonyOS readiness explicit.

**Architecture:** Separate React companion entry, portable local state, read-only public GitHub adapter, Android WebViewAssetLoader shell. Desktop routes and IPC remain independent.

**Spec:** ../specs/2026-10-02-mobile-companion-design.md

## Constraints

- Keep 1.0 draft; never publish from CI.
- No paid signing membership; native iOS pending.
- Manual transfer only; do not promise automatic sync.
- Validate version numbers and backup data before writes; preserve task descriptions and notes.
- Native Android only loads trusted packaged assets in its bridge-enabled view.

## Tasks

- [x] Test portable state and import first in `crates/devtrack-web/tests/companion.test.mjs`: invalid versions rejected, malformed imports atomic, desktop export target versions retained, mobile backup round trip, GitHub pull requests excluded, added-function evidence excludes calls and removed declarations.
- [x] Implement state validation and GitHub normalization in `crates/devtrack-web/src/companion/model.ts` and `github.ts`. Run `npm test --workspace devtrack-web`.
- [x] Collect and inspect 12ui candidates; expand the selected phone layout into project detail and transfer states, integrate generated layout with React behavior. Add separate `companion.html` and companion build config. Verify phone and tablet views, task creation/editing, reload persistence, tags, notes, JSON transfer and GitHub filters through browser automation.
- [x] Add `mobile/android` Gradle application with native import/share bridges scoped to packaged asset origin. Add CI Android build and emulator smoke checks, signing via ignored local key and repository secrets. Attach APK only to existing draft after successful build and installation.
- [x] Review the final patch, rerun affected checks, commit and push, and update draft notes and SHA-256 checksums with actual artifact availability.
