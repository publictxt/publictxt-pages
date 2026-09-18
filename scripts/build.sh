#!/usr/bin/env sh
# Full build pipeline: sync -> hashtags -> hugo -> pagefind
# Usage: scripts/build.sh [--source <repo dir>] [--serve]
#   HUGO_BASEURL=https://host/  overrides baseURL from hugo.toml
set -e
cd "$(dirname "$0")/.."

SOURCE="example/txt"
SERVE=""

usage() {
  cat <<'EOF'
Usage: scripts/build.sh [--source <repo dir>] [--serve]

Options:
  --source <repo dir>   PublicTxt source repository directory (default: example/txt)
  --serve               Run hugo server after preprocessing
  -h, --help            Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --serve)
      SERVE=1
      shift
      ;;
    --source)
      if [ "$#" -lt 2 ]; then
        echo "error: --source requires a directory path" >&2
        usage >&2
        exit 2
      fi
      SOURCE="$2"
      shift 2
      ;;
    --source=*)
      SOURCE="${1#*=}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument '$1'" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ ! -d "$SOURCE" ]; then
  echo "error: source directory not found: '$SOURCE'" >&2
  echo "hint: use --source <path>, e.g. scripts/build.sh --source /path/to/txt" >&2
  exit 1
fi

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
