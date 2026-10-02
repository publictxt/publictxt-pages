#!/usr/bin/env python3
"""
map_lint.py — checks docs/wiki/index.md's map against the tree, both ways:
  UNMAPPED  a source file the map doesn't list
  GONE      a file the map lists that no longer exists

The map is its ```txt blocks. A line starting at column 0 lists a file by
path (`scripts/build.py  …`), or opens a folder (`layouts/_partials/  …`);
an indented line starting with a file name lists that file in the open
folder (`  head.html  …` = layouts/_partials/head.html). Only a line's
first word counts — descriptions name other files freely. Outside the
blocks, a file's full path in the prose maps it too.

Usage: python scripts/map_lint.py. Exits 1 on any report.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "docs" / "wiki" / "index.md"

SOURCE_GLOBS = (
    "scripts/*.py", "scripts/*.sh", "scripts/*.ps1",
    "layouts/**/*.html",
    "assets/**/*.js", "assets/**/*.css",
    "deploy/*.yml", ".github/workflows/*.yml",
    "tests/*.py", "tests/js/*.mjs",
    "hugo.toml",
)
SOURCE_EXCLUDE = {"tests/__init__.py"}

FILE_RE = re.compile(r"[\w./-]+\.(?:py|sh|ps1|html|js|mjs|css|yml|toml)")


def mapped(text: str) -> set[str]:
    """The paths the map's blocks list, folder headings resolved."""
    paths = set()
    for block in re.findall(r"```txt\n(.*?)```", text, re.DOTALL):
        folder = ""
        for line in block.splitlines():
            if not line.strip():
                continue
            first = line.split()[0]
            if not line[0].isspace():
                folder = first if first.endswith("/") else ""
                if FILE_RE.fullmatch(first):
                    paths.add(first)
            elif folder and FILE_RE.fullmatch(first):
                paths.add(folder + first)
    return paths


def check(text: str, sources: set[str], exists) -> list[str]:
    listed = mapped(text)
    problems = [f"UNMAPPED {rel}" for rel in sorted(sources - SOURCE_EXCLUDE)
                if rel not in listed and rel not in text]
    problems += [f"GONE     {rel}" for rel in sorted(listed) if not exists(rel)]
    return problems


def main() -> int:
    sources = {f.relative_to(ROOT).as_posix() for g in SOURCE_GLOBS for f in ROOT.glob(g)}
    problems = check(MAP.read_text(encoding="utf-8"), sources, lambda rel: (ROOT / rel).exists())
    for p in problems:
        print(p)
    print(f"map: {len(sources)} source file(s), {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
