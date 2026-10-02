# Ratings, categories, drafts and an edit link

A day of small features that change how a site reads:

- **Ratings.** `rating: 4` in a page's front matter shows stars, sorts lists by *Top
  rated*, and adds a minimum-rating filter — for reviews, reading lists, recipes.
- **Categories.** A short, fixed list in the settings — unlike tags, which are
  free-form. A page picks one or more with `category:`.
- **Drafts.** `publish: off` keeps a page off the site. Hidden, not private: it's still
  in the repo.
- **An edit link.** *Improve this page*, in the footer, opens the page's file in
  GitHub's editor — a reader who spots a typo is two clicks from fixing it.
- **YouTube embeds.** A YouTube link in image syntax, `![](https://youtu.be/…)`, becomes
  a player.
- **Filter groups fold**, so a long tag list doesn't push the results off the screen.

Footer wording became a setting too, and the Mastodon profile link moved into the page
head, where it verifies the site without cluttering the footer.

#filters #embeds — details in [Writing](../../wiki/writing.md#categories-and-ratings).
