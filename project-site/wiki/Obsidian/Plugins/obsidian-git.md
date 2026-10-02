# Obsidian Git

[Obsidian Git](https://github.com/Vinzent03/obsidian-git), a community plugin, commits
and pushes your vault from inside Obsidian. With the
[publish workflow](../../setup.md#5-add-the-publish-workflow) in your repo, a push *is*
a publish — so this is your publish button.

## Install

**Settings → Community plugins → Browse**, search for **Git** (by Vinzent), install and
enable it.

On desktop it drives the Git installed on your machine (`git --version` to check). Sign
in to GitHub once — through GitHub Desktop or Git Credential Manager — so pushes don't
ask for a password.

## Day to day

From the command palette (`Ctrl/Cmd+P`):

- **Commit-and-sync** — commit every change, pull, then push. One command to publish.
- **Pull** — bring in edits made elsewhere first: on another device, or through the
  site's *Improve this page* link, which commits on GitHub.
- **Open source control view** — see what changed, and commit some files but not others.

## Settings for publishing

Older versions call commit-and-sync *backup*; the settings are the same.

| Setting | Suggested | Why |
|---|---|---|
| Auto commit-and-sync interval | Off (`0`), or long | Every automatic push publishes — half-written notes too |
| Auto commit-and-sync after stopping file edits | On, if you use an interval | Waits for a pause, not mid-sentence |
| Pull on startup | On | Picks up edits from GitHub or another device before you write, avoiding conflicts |
| Commit message | Your choice | What the repo's history shows for each publish |

Whatever you choose, keep drafts off the site with an unticked `publish` property until
they're ready — [Properties](../properties.md#publish).

## Keep Obsidian's own files out

Some of `.obsidian/` changes on every click. Add to the vault's `.gitignore`, which the
plugin respects:

```gitignore
.obsidian/workspace*.json
.trash/
```

## On a phone

It works on iOS and Android without Git installed, but slowly on large vaults, and it
signs in with a GitHub personal access token rather than your password. For a big vault,
[Setup](../../setup.md#7-commit-and-push-from-obsidian) has alternatives.
