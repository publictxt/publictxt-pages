#!/usr/bin/env python3
"""
build.py — the full pipeline: sync -> hugo -> pagefind -> check the search
index. One script for every OS, so the steps can't drift between shells.

  python scripts/build.py                        example/txt -> public/
  python scripts/build.py --source ../my-repo    your own repo (a bare path works too)
  python scripts/build.py --serve                sync, then hugo server
  HUGO_BASEURL=https://host/ python scripts/build.py     (or --base-url)

A relative --source is from this repo's root, wherever you run it from. The
source's settings/site.toml (sync copies it to build/) overlays hugo.toml.
Any failing step stops the build with its exit code.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from html.parser import HTMLParser
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


class _PageKeys(HTMLParser):
    """A page's data-pagefind-body flag and pagefind-keys.html span, if any."""

    def __init__(self):
        super().__init__()
        self.body = False
        self.sorts: set[str] | None = None
        self.filters: set[str] | None = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.body = self.body or "data-pagefind-body" in a
        if self.sorts is None and "data-pagefind-sort" in a:
            names = lambda v: {k.split("[")[0].strip() for k in (v or "").split(",") if k.strip()}
            self.sorts = names(a["data-pagefind-sort"])
            self.filters = names(a.get("data-pagefind-filter"))


def check_search_index(public: Path) -> list[str]:
    """
    Pagefind loses pages silently, so fail loudly. Problems (none = fine):
    its page count differs from the data-pagefind-body pages; or a body page
    lacks a sort key or filter another has — Pagefind drops it from any search
    sorted or filtered on that key (pagefind-keys.html, traps.md).
    """
    pages = {}
    for f in public.rglob("*.html"):
        if f.is_relative_to(public / "pagefind"):
            continue
        p = _PageKeys()
        p.feed(f.read_text(encoding="utf-8"))
        if p.body:
            pages[f.relative_to(public).as_posix()] = p
    entry = json.loads((public / "pagefind" / "pagefind-entry.json").read_text(encoding="utf-8"))
    indexed = sum(lang["page_count"] for lang in entry["languages"].values())

    problems = []
    if indexed != len(pages):
        problems.append(f"Pagefind indexed {indexed} page(s); {len(pages)} have data-pagefind-body")
    all_sorts = set().union(*(p.sorts or set() for p in pages.values()))
    all_filters = set().union(*(p.filters or set() for p in pages.values()))
    for path, p in sorted(pages.items()):
        if p.sorts is None:
            problems.append(f"{path}: no pagefind-keys.html span — gone from every sorted or filtered search")
        elif missing := sorted((all_sorts - p.sorts) | (all_filters - p.filters)):
            problems.append(f"{path}: lacks {', '.join(missing)} — gone from searches using them")
    return problems


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
        if problems := check_search_index(ROOT / "public"):
            raise StepFailed("search index check:\n  " + "\n  ".join(problems))
    except StepFailed as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
