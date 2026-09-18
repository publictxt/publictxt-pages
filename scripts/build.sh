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
  # -M keeps the live-reload render in memory so it never overwrites public/'s
  # built HTML with dev-mode markup; --renderStaticToDisk is what still lets
  # the server see Pagefind's index, which pagefind writes straight into
  # public/ after a full build and which -M alone would hide (Hugo's own
  # content/static/assets pipeline never touches it either way).
  exec hugo server -D -M --renderStaticToDisk
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
