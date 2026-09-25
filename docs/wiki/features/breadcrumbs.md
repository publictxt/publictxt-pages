---
covers:
  - layouts/_partials/breadcrumbs.html
  - layouts/_partials/crumb-label.html
---

# Breadcrumbs

`baseof.html` renders the `.Ancestors` trail on every page but home. It works because
sync gives every folder an `_index.md` ([sections.md](sections.md)). Labels are folder
names, date folders literal — see `crumb-label.html`.
