#!/usr/bin/env bash
# cloud-setup.sh — installs Hugo (extended) and Pagefind into /usr/local/bin for a
# fresh Linux container (Claude Code cloud environment setup script). Idempotent.
# Versions: Hugo = the CI pin (.github/workflows/test.yml), Pagefind = build.py's PAGEFIND_VERSION.
set -euo pipefail
HUGO_VERSION=0.162.1
PAGEFIND_VERSION=1.5.2
BIN=/usr/local/bin
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

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
