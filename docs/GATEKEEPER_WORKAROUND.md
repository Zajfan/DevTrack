# Gatekeeper Workaround for macOS

Since DevTrack is distributed without an Apple Developer Program subscription ($99/year), macOS Gatekeeper will block the app by default. Here's how to run DevTrack on macOS:

## Quick Fix (One-time)

Right-click the DevTrack.app and select **Open** from the context menu. macOS will show a dialog asking if you're sure you want to open it. Click **Open**.

## Alternative: Remove Quarantine Attribute

```bash
# Remove the quarantine attribute
xattr -d com.apple.quarantine /Applications/DevTrack.app

# Or if you downloaded a .dmg and mounted it:
xattr -d com.apple.quarantine /Volumes/DevTrack/DevTrack.app
```

## Homebrew Installation (Recommended)

```bash
brew install --cask devtrack
```

Homebrew automatically handles Gatekeeper for you.

## For Developers (Building from Source)

```bash
# Build locally
cargo tauri build --manifest-path crates/devtrack-desktop/Cargo.toml

# The resulting .app in target/release/bundle/macos/DevTrack.app
# will not have the quarantine attribute since you built it yourself
```

## Why This Happens

macOS Gatekeeper blocks apps that aren't:
1. Signed with a valid Apple Developer ID certificate
2. Notarized by Apple
3. Distributed through the Mac App Store

Since DevTrack is open-source and free, we don't pay the $99/year Apple Developer Program fee. This is a deliberate choice to keep DevTrack free and open-source.

## Verification

After opening DevTrack once (via right-click → Open), macOS will remember your choice and allow future launches without prompts.