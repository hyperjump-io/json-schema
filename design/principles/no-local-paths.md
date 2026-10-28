# No local paths in output

Messages and output don't say where files are on the machine. They're
copied into logs, issues, and pages, and a path says who the user is and
how their machine is laid out. This is a reason to deviate from the spec:
an output format's `absoluteKeywordLocation` for a schema in a file is
relative to the working directory.

- A `file:` URI in a message, an error, or an output is relative to the
  working directory (see
  [Local paths in messages and output](../components/file-uris.md)).
- Lint rule pages are checked with an `https:` URI, like the site, so a
  test's temporary path can't end up in one.
