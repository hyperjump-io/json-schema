# `x-` keywords

Keyword names starting with `x-` are reserved for schema authors in every
dialect. They're guaranteed to never collide with a keyword, so they must
never assert. One in a dialect or vocabulary in the config throws, and
so does `extendDialect`, and so does a meta-schema defining a dialect with one. They're always allowed in schemas, even when unknown
keywords are errors, and then they're annotations (v1).
