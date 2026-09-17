#!/usr/bin/env sh
# Full build pipeline: sync -> hashtags -> hugo -> pagefind
# Usage: scripts/build.sh [source_repo] [--serve]
#   HUGO_BASEURL=https://host/  overrides baseURL from hugo.toml
set -e
cd "$(dirname "$0")/.."

SOURCE="example/txt"
SERVE=""
for arg in "$@"; do
  case "$arg" in
    --serve) SERVE=1 ;;
    *) SOURCE="$arg" ;;
  esac
done

python3 scripts/sync_content.py "$SOURCE" build/content
python3 scripts/extract_hashtags.py build/content

if [ -n "$SERVE" ]; then
  exec hugo server -D
fi

# Hugo does not remove stale pages from a previous build
rm -rf public
if [ -n "$HUGO_BASEURL" ]; then
  hugo --minify -b "$HUGO_BASEURL"
else
  hugo --minify
fi

if command -v pagefind >/dev/null 2>&1; then
  pagefind --site public
else
  npx pagefind --site public
fi
