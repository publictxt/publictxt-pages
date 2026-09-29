#!/usr/bin/env python3
"""
map_lint.py — checks docs/wiki/index.md's map against the tree, both ways:

  UNMAPPED  a source file the map doesn't mention (by path, or bare name
            under a heading such as layouts/_partials/)
  GONE      a file the map names that no longer exists

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
    "tests/*.py",
    "hugo.toml",
)
SOURCE_EXCLUDE = {"tests/__init__.py"}
# A file named in the map's code blocks: a path or a bare name with a source extension.
NAMED_RE = re.compile(r"(?<![\w./-])([\w./-]+\.(?:py|sh|ps1|html|js|css|yml|toml))\b")


def main() -> int:
    text = MAP.read_text(encoding="utf-8")
    sources = {f.relative_to(ROOT).as_posix(): f.name
               for g in SOURCE_GLOBS for f in ROOT.glob(g)}
    names = set(sources.values())
    problems = [f"UNMAPPED {rel}" for rel, name in sorted(sources.items())
                if rel not in SOURCE_EXCLUDE and rel not in text and name not in text]
    blocks = "\n".join(re.findall(r"```txt\n(.*?)```", text, re.DOTALL))
    for named in sorted(set(NAMED_RE.findall(blocks))):
        if not (ROOT / named).exists() and named not in names:
            problems.append(f"GONE     {named}")
    for p in problems:
        print(p)
    print(f"map: {len(sources)} source file(s), {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
