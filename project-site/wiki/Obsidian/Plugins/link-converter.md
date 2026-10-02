# Link Converter

[Link Converter](https://github.com/ozntel/obsidian-link-converter), a community
plugin, converts links between `[[wikilinks]]` and Markdown links. It's the way to bring
a vault written with wikilinks onto the site, where they'd otherwise show as plain text.

## Convert a vault

1. **Turn wikilinks off first** — **Settings → Files and links → Use `[[Wikilinks]]`**
   off — so every new link is a Markdown link.
2. **Commit** everything (Obsidian Git's *Commit-and-sync*, or your Git client). A bulk
   edit is one you'll want to review, and perhaps undo.
3. In Link Converter's settings, set the converted link format to **relative paths**, to
   match [Setup](../../setup.md#3-configure-obsidian).
4. Run **Vault: Links to Markdown** from the command palette — or *File: Links to
   Markdown* for one note, or a folder's right-click menu for one folder.
5. **Review the diff**, [build locally](../../setup.md#optional-preview-locally) to check
   for dead links and misplaced images, then push.

Embeds convert too, to image syntax: `![[pic.png]]` becomes an image link, and a note
embed becomes one the site [embeds](../../writing.md#embedding-notes) in turn, when it's
on a line of its own.

## Afterwards

With wikilinks off, Obsidian writes Markdown links from then on, so the plugin has done
its job; keep it for the odd pasted wikilink, or uninstall it.
