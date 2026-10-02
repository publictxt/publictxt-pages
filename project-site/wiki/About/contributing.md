# Contributing

publictxt-pages lives on [GitHub](https://github.com/publictxt/publictxt-pages): bug
reports, ideas and pull requests go there.

## Run it

You need Python 3.10+, Hugo 0.158+ and Pagefind 1.5.2 (or Node, to fetch it).

```bash
git clone https://github.com/publictxt/publictxt-pages
cd publictxt-pages
python scripts/build.py                          # the example vault -> public/
python scripts/build.py --source project-site    # this site
python scripts/build.py --serve                  # preview at http://localhost:1313/
```

## Test it

```bash
python -m unittest                    # the pipeline; no packages
node --test "tests/js/*.test.mjs"     # the browser modules; Node 22+
```

The pipeline's output over the example vault is kept as a snapshot. After an intended
change, refresh it and read the diff — the
[README](https://github.com/publictxt/publictxt-pages#tests) has the commands.

## Find your way around

- [`docs/SPEC.md`](https://github.com/publictxt/publictxt-pages/blob/main/docs/SPEC.md) —
  what the site does and should do; **(TBD)** marks what isn't built yet
- [`docs/wiki/index.md`](https://github.com/publictxt/publictxt-pages/blob/main/docs/wiki/index.md) —
  every source file, one line each
- [`docs/wiki/traps.md`](https://github.com/publictxt/publictxt-pages/blob/main/docs/wiki/traps.md) —
  rules that span files; read it before changing templates or the pipeline
- [`example/txt/`](https://github.com/publictxt/publictxt-pages/tree/main/example/txt) —
  the example vault and test fixture: each file is a case the pipeline must handle

## Improve these pages

This site is the
[`project-site/`](https://github.com/publictxt/publictxt-pages/tree/main/project-site)
folder of the repo, and its wiki is the user guide. **Improve this page**, at the foot
of every page, opens it in GitHub's editor. A change to what the site does updates the
guide in the same pull request.
