# DevTrack Android companion

Android 8 or newer. This application packages the companion UI locally and does not require a localhost server. Local plans and notes work offline. Public GitHub data requires an internet connection when refreshed.

## Build

From the repository root, install Node 24 dependencies with `npm ci`, then run:

```sh
npm run build:companion --workspace devtrack-web
mkdir -p mobile/android/app/src/main/assets
cp -R crates/devtrack-web/dist-companion/. mobile/android/app/src/main/assets/
cd mobile/android
gradle --no-daemon assembleDebug lintRelease
```

Use JDK 17, Gradle 8.11.1, and Android SDK platform/build tools 35. Debug output is `app/build/outputs/apk/debug/app-debug.apk`.

For release builds, set `DEVTRACK_ANDROID_KEYSTORE` to the private PKCS12 key path and `DEVTRACK_ANDROID_STORE_PASSWORD` to its password. The signing alias is `devtrack`. Keep the key and password backed up outside git; future updates require the same key. Run `gradle --no-daemon assembleRelease lintRelease`.

The `Android Companion Draft` GitHub workflow builds, runs browser checks, verifies offline persistence in an Android emulator, installs and launches the signed release APK, and attaches it only to an existing draft release. Native iOS and native HarmonyOS are pending.

Transfer uses validated JSON backups with explicit replacement confirmation. Desktop task exports can seed the companion. Automatic synchronization and importing companion backups into the desktop application are not implemented.
