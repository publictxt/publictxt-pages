#!/usr/bin/env bash
# cloud-setup.sh — installs Hugo (extended) and Pagefind into /usr/local/bin for a
# fresh Linux container (Claude Code cloud environment setup script). Idempotent.
# Hugo: the latest release, as live sites tend to run (CI tests the oldest supported).
# Pagefind: build.py's PAGEFIND_VERSION — search.js is written against its API.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=/usr/local/bin
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

# The latest Hugo's number, from the hugo-extended npm package (it tracks Hugo's
# releases): sandboxed networks often block GitHub's API and releases/latest.
# Unknown -> CI's version, the oldest supported.
HUGO_VERSION=$(curl -fsS https://registry.npmjs.org/hugo-extended/latest 2>/dev/null \
  | sed -n 's/.*"version":"\([0-9.]*\)".*/\1/p') || true
HUGO_VERSION=${HUGO_VERSION:-$(sed -n 's/.*hugo-version: "\(.*\)"/\1/p' .github/workflows/test.yml)}
PAGEFIND_VERSION=$(sed -n 's/^PAGEFIND_VERSION = "\(.*\)"/\1/p' scripts/build.py)

if ! hugo version 2>/dev/null | grep -q "v${HUGO_VERSION}-.*extended"; then
  curl -fsSL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" \
    | tar xz -C "$tmp" hugo
  install "$tmp/hugo" "$BIN/hugo"
fi

if [ "$(pagefind --version 2>/dev/null)" != "pagefind ${PAGEFIND_VERSION}" ]; then
  curl -fsSL "https://github.com/Pagefind/pagefind/releases/download/v${PAGEFIND_VERSION}/pagefind_extended-v${PAGEFIND_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
    | tar xz -C "$tmp" pagefind_extended
  install "$tmp/pagefind_extended" "$BIN/pagefind"
fi

hugo version
pagefind --version
