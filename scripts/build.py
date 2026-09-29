#!/usr/bin/env python3
"""
build.py — the full pipeline: sync -> hugo -> pagefind. One script for every
OS, so the steps can't drift between shells.

  python scripts/build.py                        example/txt -> public/
  python scripts/build.py --source ../my-repo    your own repo (a bare path works too)
  python scripts/build.py --serve                sync, then hugo server
  HUGO_BASEURL=https://host/ python scripts/build.py     (or --base-url)

A relative --source is from this repo's root, wherever you run it from. The
source's settings/site.toml (sync copies it to build/) overlays hugo.toml.
Any failing step stops the build with its exit code.
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# search.js is written against this Pagefind's JS API; bump both together.
PAGEFIND_VERSION = "1.5.2"


class StepFailed(Exception):
    pass


def run(*cmd: str) -> None:
    exe = shutil.which(cmd[0])
    if not exe:
        raise StepFailed(f"{cmd[0]} not found on PATH")
    code = subprocess.run([exe, *cmd[1:]], cwd=ROOT).returncode
    if code:
        raise StepFailed(f"{cmd[0]} failed (exit {code})")


def pagefind() -> None:
    if exe := shutil.which("pagefind"):
        found = subprocess.run([exe, "--version"], capture_output=True, text=True).stdout.split()
        if found[1:2] != [PAGEFIND_VERSION]:
            print(f"warning: {' '.join(found)} on PATH; this site pins {PAGEFIND_VERSION}", file=sys.stderr)
        run("pagefind", "--site", "public")
    else:
        run("npx", "--yes", f"pagefind@{PAGEFIND_VERSION}", "--site", "public")


def main() -> int:
    ap = argparse.ArgumentParser(description="sync -> hugo -> pagefind")
    ap.add_argument("path", nargs="?", help="source repo (same as --source)")
    ap.add_argument("--source", help="source repo directory (default: example/txt)")
    ap.add_argument("--serve", action="store_true", help="sync, then run hugo server")
    ap.add_argument("--base-url", default=os.environ.get("HUGO_BASEURL"),
                    help="override baseURL (default: $HUGO_BASEURL)")
    args = ap.parse_args()
    if args.path and args.source:
        ap.error("give the source once: --source or a bare path")

    source = ROOT / (args.source or args.path or "example/txt")
    if not source.is_dir():
        ap.error(f"source directory not found: '{source}'")

    try:
        run(sys.executable, "scripts/sync_content.py", str(source), "build/content")
        config = "hugo.toml,build/site.toml" if (ROOT / "build/site.toml").is_file() else "hugo.toml"

        if args.serve:
            # -M keeps the live-reload render in memory so it never overwrites
            # public/'s built HTML with dev markup; --renderStaticToDisk still
            # serves Pagefind's index, which only a full build writes to public/.
            run("hugo", "server", "-D", "-M", "--renderStaticToDisk", "--config", config)
            return 0

        # Hugo doesn't remove stale pages from a previous build.
        shutil.rmtree(ROOT / "public", ignore_errors=True)
        run("hugo", "--minify", "--config", config, *(["-b", args.base_url] if args.base_url else []))
        pagefind()
    except StepFailed as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
