--- 
categories: 
    - Tech
    - CompSci
---
# Hashtags

[Pipeline](_index.md) -> Hashtags #pipeline #hashtags

An inline `#tag` becomes a link to its tag page and joins the page's `tags:` front matter — hashtags and front matter tags are one list. [Dates](Dates.md) are the other thing sync fills in.

```sh
# a hashtag inside a code block must NOT become a tag
echo "#not-a-tag"
```

And `#also-not-a-tag` inline code is ignored too.
