#!/usr/bin/env bash
# Replace the Ubuntu logo in Settings > About and on the login screen with the
# Apple logo, in a way package updates don't undo. Needs sudo.
#
#   ./install-branding.sh            install
#   ./install-branding.sh --remove   restore Ubuntu's logos
#
# Ubuntu's Settings and the login screen read these exact files from the
# base-files package. dpkg-divert moves the originals to *.distrib, so updates
# to base-files write there instead of overwriting the Apple logo.
set -e

here=$(cd "$(dirname "$0")" && pwd)/branding
dir=/usr/share/pixmaps
declare -A logos=(
    [ubuntu-logo-text-dark.svg]=apple-logo-white.svg
    [ubuntu-logo-text.svg]=apple-logo-black.svg
)

if [[ "$1" == "--remove" ]]; then
    for name in "${!logos[@]}"; do
        if dpkg-divert --list "$dir/$name" | grep -q .; then
            sudo rm -f "$dir/$name"
            sudo dpkg-divert --local --rename --remove "$dir/$name"
        fi
    done
    echo "Ubuntu logos restored. Reopen Settings; the login screen changes at your next log out."
    exit 0
fi

for name in "${!logos[@]}"; do
    if ! dpkg-divert --list "$dir/$name" | grep -q .; then
        sudo dpkg-divert --local --rename --add "$dir/$name"
    fi
    sudo install -m644 "$here/${logos[$name]}" "$dir/$name"
done
echo "Done. Reopen Settings; the login screen changes at your next log out."
