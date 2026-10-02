#!/usr/bin/env bash
set -euo pipefail

dmg=${1:?Usage: smoke-macos-package.sh path/to/DevTrack.dmg}
mount_point="$RUNNER_TEMP/devtrack-dmg"
app_path="$RUNNER_TEMP/DevTrack.app"
mkdir -p "$mount_point"
cleanup() {
  pkill -f "$app_path/Contents/MacOS/devtrack-desktop" 2>/dev/null || true
  hdiutil detach "$mount_point" -quiet -force 2>/dev/null || true
}
trap cleanup EXIT

hdiutil attach "$dmg" -nobrowse -readonly -mountpoint "$mount_point" -quiet
source_app=$(find "$mount_point" -maxdepth 2 -name DevTrack.app -print -quit)
test -n "$source_app"
ditto "$source_app" "$app_path"

binary="$app_path/Contents/MacOS/devtrack-desktop"
test -x "$binary"
arches=$(lipo -archs "$binary")
host_arch=$(uname -m)
case "$host_arch" in
  arm64) [[ " $arches " == *' arm64 '* ]] ;;
  x86_64) [[ " $arches " == *' x86_64 '* ]] ;;
  *) echo "Unexpected runner architecture: $host_arch" >&2; exit 1 ;;
esac

open -n "$app_path"
for attempt in $(seq 1 45); do
  if pgrep -f "$binary" >/dev/null; then
    echo "Mounted $dmg ($arches) and launched $app_path"
    exit 0
  fi
  sleep 1
done
echo "DevTrack did not remain running after launch" >&2
exit 1
