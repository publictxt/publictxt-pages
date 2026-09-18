# Example PublicTxt repository

This folder mimics a real PublicTxt / Obsidian repository, deliberately including every
characteristic the Hugo pipeline has to cope with:

- **No front matter** on most files — titles come from the first `# H1`, `created` dates from filenames or Git history
- `index.md` / `home.md` used as folder index pages (Hugo would treat `index.md` as a leaf bundle)
- Blog posts in three layouts: `blog/YYYY/MM/DD/YYYYMMDD.md`, `blog/YYYY/YYYYMMDD-title.md`, `blog/YYYYMMDD-title.md`
- Wiki pages nested several folders deep, with their own `index.md`
- Spaces and dots in filenames (`Other Software.md`, `The WhatsApp Mess . 20240816.md`, `Obsidian.md.md`)
- Front matter with YAML **block-style** `tags:` lists and custom keys (`web:`, `web-links:`)
- Inline `#hashtags`, including inside code (which must be ignored)
- `[[wikilinks]]` (unsupported in v1 — render as literal text)
- Relative links to `index.md` / `home.md`, cross-section links, dangling links
- Root-level pages outside any section (`Projects.md`, `online-things.md`)
- An empty section (`posts/`) and an empty folder holding only `.gitkeep`
- Non-Markdown assets (`media/`)
- Repo housekeeping files that must be skipped: this README, `LICENSE`, `CNAME`, `.obsidian/`

Files skipped by the sync step are never published; everything else is.
