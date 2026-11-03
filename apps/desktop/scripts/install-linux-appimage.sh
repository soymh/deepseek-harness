#!/bin/sh
# Install a DeepSeek Harness Linux AppImage for the current user.
#
# Usage: install-linux-appimage.sh <path-to-AppImage> [--dir <applications-directory>]
#
# The image keeps its versioned filename: the updater replaces and renames the file it is running,
# so the launcher resolves the newest image in the directory instead of a fixed path.
set -eu

fail() {
  echo "install-linux-appimage: $*" >&2
  exit 1
}

image=${1:-}
[ -n "$image" ] || fail "usage: install-linux-appimage.sh <path-to-AppImage> [--dir <applications-directory>]"
shift
[ -f "$image" ] || fail "$image is not a file"

applications=${HOME}/Applications
if [ "${1:-}" = "--dir" ]; then
  [ -n "${2:-}" ] || fail "--dir requires a directory"
  applications=$2
fi

mkdir -p "$applications" "${HOME}/.local/bin" "${HOME}/.local/share/applications"

name=$(basename "$image")
case "$name" in
  *.AppImage) ;;
  *) fail "$image is not an AppImage" ;;
esac
installed=$applications/$name
if [ "$image" != "$installed" ]; then
  cp "$image" "$installed"
fi
chmod 755 "$installed"

# Extract only the icon entries; a full extraction would unpack the whole application.
icon_dir=$(mktemp -d)
trap 'rm -rf "$icon_dir"' EXIT INT TERM
(
  cd "$icon_dir"
  "$installed" --appimage-extract 'usr/share/icons/*' >/dev/null 2>&1 || true
)
icon=$(find "$icon_dir/squashfs-root/usr/share/icons" -name 'deepseek-harness.png' 2>/dev/null | sort -r | head -n 1)
if [ -n "$icon" ]; then
  size=$(basename "$(dirname "$icon")")
  case "$size" in
    [0-9]*x[0-9]*) ;;
    *) size=512x512 ;;
  esac
  mkdir -p "${HOME}/.local/share/icons/hicolor/${size}/apps"
  cp "$icon" "${HOME}/.local/share/icons/hicolor/${size}/apps/deepseek-harness.png"
fi

cat > "${HOME}/.local/bin/deepseek-harness" <<'LAUNCHER'
#!/bin/sh
# Launch the newest DeepSeek Harness AppImage; updates replace the versioned file in the same directory.
set -eu
root=${DEEPSEEK_HARNESS_DIR:-$HOME/Applications}
image=$(ls -t "$root"/deepseek-harness-*.AppImage 2>/dev/null | head -n 1)
[ -n "$image" ] || { echo "deepseek-harness: no AppImage found in $root" >&2; exit 1; }
exec "$image" --no-sandbox "$@"
LAUNCHER
chmod 755 "${HOME}/.local/bin/deepseek-harness"

cat > "${HOME}/.local/share/applications/deepseek-harness.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=DeepSeek Harness
Comment=DeepSeek Harness desktop application
Exec=${HOME}/.local/bin/deepseek-harness %U
Icon=deepseek-harness
Terminal=false
Categories=Development;
MimeType=x-scheme-handler/dsh;
StartupWMClass=DeepSeek Harness
DESKTOP
chmod 644 "${HOME}/.local/share/applications/deepseek-harness.desktop"

update-desktop-database "${HOME}/.local/share/applications" >/dev/null 2>&1 || true
gtk-update-icon-cache -f "${HOME}/.local/share/icons/hicolor" >/dev/null 2>&1 || true

echo "install-linux-appimage: installed $name"
echo "install-linux-appimage: launch with 'deepseek-harness' or the DeepSeek Harness menu entry"
