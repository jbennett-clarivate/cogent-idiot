#!/bin/sh
# Karma/Playwright-compatible Firefox shim for running tests INSIDE the
# VSCodium Flatpak sandbox on an immutable host (Bazzite/Silverblue).
#
# Why this exists:
#  - The Flatpak runtime (org.freedesktop.Sdk) ships no browser, and
#    `npx playwright install` cannot add one: it has no writable ~/.cache and
#    the runtime is missing libgtk-4/libenchant-2/libevent.
#  - The host's Firefox IS visible at /run/host, but /usr/bin/firefox is a
#    wrapper that looks for /usr/lib64/firefox, which is not mapped in here.
#    So we exec the real ELF binary directly.
#  - libxul.so needs libevent-2.1.so.7, absent from the runtime, so we bridge
#    the host's lib64 onto LD_LIBRARY_PATH.
#  - Firefox's own sandbox needs user namespaces, which EPERM inside Flatpak.
#
# Usage: FIREFOX_BIN=./scripts/firefox-flatpak.sh npm test
FIREFOX_REAL=/run/host/usr/lib64/firefox/firefox

if [ ! -x "$FIREFOX_REAL" ]; then
	echo "firefox-flatpak.sh: no host Firefox at $FIREFOX_REAL" >&2
	echo "Install it on the host: rpm-ostree install firefox (or use a distrobox)." >&2
	exit 1
fi

export LD_LIBRARY_PATH=/run/host/usr/lib64:${LD_LIBRARY_PATH}
export MOZ_DISABLE_CONTENT_SANDBOX=1
export MOZ_DISABLE_GMP_SANDBOX=1
export MOZ_DISABLE_RDD_SANDBOX=1
exec "$FIREFOX_REAL" "$@"
