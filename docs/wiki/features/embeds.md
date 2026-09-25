---
covers:
  - layouts/_markup/render-image.html
---

# Embeds

`![Title](https://www.youtube.com/watch?v=ID)` renders a youtube-nocookie iframe
titled by the alt text; `youtu.be`, `shorts/`, `embed/`, `live/` and `t=` (seconds)
work too. Other images stay plain `<img>`. Sizing is `.prose .video` in `main.css`.

Pagefind doesn't index iframe titles, so a video's alt text isn't searchable.
Example: `example/txt/notes/embeds.md`.
