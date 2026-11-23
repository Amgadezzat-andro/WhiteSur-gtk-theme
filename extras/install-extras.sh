#!/usr/bin/env bash
# Install the GNOME Shell extensions that go with this theme's local fixes.
# New extensions load after the next log out / log in on Wayland.
set -e
here=$(cd "$(dirname "$0")" && pwd)
dest="$HOME/.local/share/gnome-shell/extensions"
mkdir -p "$dest"

for ext in "$here"/*@*/; do
    uuid=$(basename "$ext")
    rm -rf "${dest:?}/$uuid"
    cp -r "$ext" "$dest/$uuid"
    gnome-extensions enable "$uuid" 2>/dev/null ||
        echo "$uuid installed; it turns on after you log out and back in."
done

python3 - <<'PY'
import ast, os, subprocess
uuids = [d for d in os.listdir(os.path.dirname(os.path.abspath(__file__)) if False else ".") if "@" in d]
PY
