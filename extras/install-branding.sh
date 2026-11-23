#!/usr/bin/env bash
# Replace the Ubuntu logo with the Apple logo, in a way package updates don't undo.
#
#   ./install-branding.sh            Settings > About (user only, no sudo)
#   ./install-branding.sh --system   also the login screen (asks for sudo)
#   ./install-branding.sh --remove   undo both
#
# Settings > About looks up the os-release LOGO ("ubuntu-logo") as an icon, and
# the user's icon directory wins over /usr/share/pixmaps. The login screen reads
# a file path from org.gnome.login-screen logo, which we point at /usr/local.
set -e

here=$(cd "$(dirname "$0")" && pwd)/branding
icons="$HOME/.local/share/icons/hicolor/scalable/apps"
system_logo=/usr/local/share/pixmaps/apple-logo-text-dark.svg
greeter=/etc/gdm3/greeter.dconf-defaults
logo_line="logo='$system_logo'"

if [[ "$1" == "--remove" ]]; then
    rm -f "$icons"/ubuntu-logo{,-text,-text-dark}.svg
    if grep -qxF "$logo_line" "$greeter" 2>/dev/null; then
        sudo sed -i "\|^$logo_line\$|d" "$greeter"
        sudo rm -f "$system_logo"
        sudo /usr/share/gdm/generate-config
    fi
    echo "Removed. Reopen Settings; the login screen changes at your next log out."
    exit 0
fi

mkdir -p "$icons"
cp "$here/apple-logo-white.svg" "$icons/ubuntu-logo-text-dark.svg"
cp "$here/apple-logo-black.svg" "$icons/ubuntu-logo-text.svg"
cp "$here/apple-logo-black.svg" "$icons/ubuntu-logo.svg"
echo "Settings > About: done (reopen Settings)."

if [[ "$1" == "--system" ]]; then
    sudo install -Dm644 "$here/apple-logo-white.svg" "$system_logo"
    if ! grep -qxF "$logo_line" "$greeter"; then
        sudo sed -i "\|^\[org/gnome/login-screen\]\$|a $logo_line" "$greeter"
    fi
    sudo /usr/share/gdm/generate-config
    echo "Login screen: done (shows at your next log out)."
fi
