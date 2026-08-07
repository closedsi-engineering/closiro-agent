#!/bin/sh
# Snailer installer — POSIX sh, safe for `curl | sh`.
#
# Attribution: the landing page copies this command with SNAILER_WEB_REF (and
# optionally SNAILER_UTM_* / SNAILER_GCLID) prefixed. Those env vars are
# inherited by this script AND by the `snailer` process we run at the end —
# the CLI persists them to disk on first run, which is what ties an ad click
# to the installation. This script never parses or stores them itself.
#
# Failure telemetry: on failure we report install_script_failed {step} to the
# telemetry ingest with a THROWAWAY id (no CLI exists yet, so there is no
# installation identity). consent_state=unset is allowed for this event by
# contract. Reporting is best-effort and never blocks or fails the install.

set -u

REPO="felixaihub/snailer-cli"
INGEST_URL="${SNAILER_INGEST_URL:-https://telemetry-ingest-64gv44yx7a-uw.a.run.app}"
BIN_DIR="${SNAILER_BIN_DIR:-$HOME/.snailer/bin}"

# ── failure reporting ────────────────────────────────────────────────────────
rand_b32() { # $1 = length, Crockford alphabet (no I L O U)
  LC_ALL=C tr -dc '0123456789ABCDEFGHJKMNPQRSTVWXYZ' </dev/urandom 2>/dev/null \
    | head -c "$1"
}
report_failure() { # $1 = step (download|extract|permission|path|unknown)
  step="$1"
  # Throwaway ids: ULID-shaped event/session ids (leading 0 keeps them in
  # range) and a random v4-shaped uuid as installation_id.
  eid="0$(rand_b32 25)"; sid="0$(rand_b32 25)"
  h() { LC_ALL=C tr -dc '0123456789abcdef' </dev/urandom 2>/dev/null | head -c "$1"; }
  iid="$(h 8)-$(h 4)-4$(h 3)-8$(h 3)-$(h 12)"
  now_ms=$(( $(date +%s) * 1000 ))
  os_name=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch_name=$(uname -m)
  curl -fsS --max-time 5 -o /dev/null -X POST \
    "$INGEST_URL/v1/telemetry/events:batch" \
    -H 'Content-Type: application/json' \
    -d "{\"schema_version\":1,\"installation_id\":\"$iid\",\"session_id\":\"$sid\",\"consent_state\":\"unset\",\"client\":{\"app\":\"install-script\",\"app_version\":\"1\",\"os\":\"$os_name\",\"arch\":\"$arch_name\",\"locale\":\"\"},\"events\":[{\"event_id\":\"$eid\",\"event_name\":\"install_script_failed\",\"client_ts\":$now_ms,\"properties\":{\"step\":\"$step\"}}]}" \
    2>/dev/null || true
}
fail() { # $1 = step, $2 = message
  report_failure "$1"
  echo "snailer install failed: $2" >&2
  exit 1
}

# ── platform ────────────────────────────────────────────────────────────────
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64)  TARGET="aarch64-apple-darwin" ;;
  Darwin/x86_64) TARGET="x86_64-apple-darwin" ;;
  Linux/x86_64)  TARGET="x86_64-unknown-linux-musl" ;;
  Linux/aarch64|Linux/arm64) TARGET="aarch64-unknown-linux-musl" ;;
  *) fail unknown "unsupported platform: $(uname -s)/$(uname -m)" ;;
esac

command -v curl >/dev/null 2>&1 || fail unknown "curl is required"
command -v tar  >/dev/null 2>&1 || fail unknown "tar is required"

# ── download ────────────────────────────────────────────────────────────────
TAG=$(curl -fsSL --max-time 15 "https://api.github.com/repos/$REPO/releases/latest" \
  | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
[ -n "$TAG" ] || fail download "could not resolve latest release"

ASSET="snailer-$TAG-$TARGET.tar.gz"
URL="https://github.com/$REPO/releases/download/$TAG/$ASSET"
TMP=$(mktemp -d 2>/dev/null || mktemp -d -t snailer) || fail unknown "mktemp failed"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading snailer $TAG ($TARGET)..."
curl -fSL --max-time 300 -o "$TMP/$ASSET" "$URL" || fail download "download failed: $URL"

# ── extract ─────────────────────────────────────────────────────────────────
tar -xzf "$TMP/$ASSET" -C "$TMP" || fail extract "archive extraction failed"
[ -f "$TMP/snailer" ] || fail extract "binary missing from archive"

# ── install ─────────────────────────────────────────────────────────────────
mkdir -p "$BIN_DIR" 2>/dev/null || fail permission "cannot create $BIN_DIR"
mv "$TMP/snailer" "$BIN_DIR/snailer" 2>/dev/null || fail permission "cannot write to $BIN_DIR"
chmod +x "$BIN_DIR/snailer" || fail permission "cannot chmod binary"

# First run WITH the inherited env — this is where the CLI persists
# SNAILER_WEB_REF / SNAILER_UTM_* / SNAILER_CAMPAIGN to disk and fires
# install_completed. Never fatal: attribution loss must not break install.
"$BIN_DIR/snailer" --version >/dev/null 2>&1 || true

echo "Installed: $BIN_DIR/snailer ($TAG)"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Add to PATH:  export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac
