# DevTrack mobile companion

The user approved a mobile companion for tasks, notes, versions and GitHub projects, keeping source folders on the desktop. All 1.0 artifacts remain in a draft. No paid Apple or Huawei membership is acceptable. Native iOS remains pending; a home-screen web app was explicitly declined. Huawei registration is free but verification and native signing setup remain external prerequisites.

## Shared companion

A separate React entry uses the approved desktop colors and typography with touch-sized controls, project cards, exact tag filtering, per-project Planned / Completed / Notes tabs, and a transfer screen. It must operate without Tauri IPC or a localhost server. Tasks and notes persist locally, with validated version numbers including two components, three components and prereleases. Public GitHub repositories supply read-only issues and completed commit evidence; routine commits are hidden by default and filters cover change type, file and function. No private-repository authentication is claimed.

Manual JSON backup/restore preserves mobile projects, tasks and notes. Desktop JSON exports can be imported as a starting copy, preserving target versions and task descriptions. Existing desktop export lacks notes and GitHub remote URLs, so the phone lets users supply repository URLs. This is manual transfer, not automatic synchronization; mobile backups cannot be passed to the legacy desktop importer. That limitation must be visible in the transfer screen and release notes. Import validates the complete payload before replacing stored data, and the user explicitly chooses to replace it.

## Android

An Android application packages the companion assets with WebViewAssetLoader at a fixed local HTTPS origin. No external page loads inside the bridge-enabled view. Native document picker and share sheet provide JSON import/export without broad storage permissions. Release APKs use a stable self-signing key kept outside git, backed up by the owner, and CI secrets. Android distribution is direct APK sideloading, without a paid store membership. Verify installation and offline launch in an emulator before calling the APK ready.

## Deferred native platforms

Native iOS packaging requires the user's free personal signing setup and device installation through Xcode; no generally installable IPA or paid membership workaround is promised. HarmonyOS requires a distinct native HAP wrapper and Huawei SDK/signing setup, rather than renaming an Android APK. Do not create placeholder release assets for either platform. The 1.0 draft remains unpublished while they are pending.
