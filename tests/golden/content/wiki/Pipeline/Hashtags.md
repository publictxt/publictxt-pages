---
categories: 
    - Tech
    - CompSci
title: "Hashtags"
created: 2025-01-01T12:00:00+00:00
created_source: git
updated: 2025-03-01T12:00:00+00:00
source_path: "wiki/Pipeline/Hashtags.md"
tags: ["pipeline", "hashtags"]
---
[Pipeline](_index.md) -> Hashtags [#pipeline](/tags/pipeline/) [#hashtags](/tags/hashtags/)

An inline `#tag` becomes a link to its tag page and joins the page's `tags:` front matter — hashtags and front matter tags are one list. [Dates](Dates.md) are the other thing sync fills in.

```sh
# a hashtag inside a code block must NOT become a tag
echo "#not-a-tag"
```

And `#also-not-a-tag` inline code is ignored too.
