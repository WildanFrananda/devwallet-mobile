#!/usr/bin/env bash
# Nuke + rebuild iOS clean state.
# Use when NitroModulesSpec.h missing, codegen stale, or weird Xcode caches.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APP_BUNDLE_ID="com.devwallet.app"
PROJECT_NAME="DevWallet"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }

step() { cyan ">> $*"; }

# 1. Kill any running Metro on 8081
step "kill metro on :8081"
if lsof -ti tcp:8081 >/dev/null 2>&1; then
  lsof -ti tcp:8081 | xargs kill -9 || true
fi

# 2. Wipe DerivedData for this project
step "wipe DerivedData for $PROJECT_NAME-*"
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/$PROJECT_NAME"-*

# 3. Wipe Pods + lockfile + ios build dir
step "wipe ios/{Pods,Podfile.lock,build}"
rm -rf "$ROOT/ios/Pods" "$ROOT/ios/Podfile.lock" "$ROOT/ios/build"

# 4. Wipe Metro + watchman caches
step "reset metro + watchman caches"
rm -rf "$TMPDIR/metro-"* "$TMPDIR/haste-map-"* 2>/dev/null || true
if command -v watchman >/dev/null 2>&1; then
  watchman watch-del-all >/dev/null 2>&1 || true
fi

# 5. Re-install pods (forces Nitro codegen re-run)
step "pod install"
( cd "$ROOT/ios" && pod install )

# 6. Uninstall stale app from booted simulator (if any)
step "uninstall $APP_BUNDLE_ID from booted simulator"
xcrun simctl uninstall booted "$APP_BUNDLE_ID" 2>/dev/null || true

green ">> done. now run: bun run ios"
