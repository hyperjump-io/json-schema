# The language server

- Its `allowRetrieval` is the workspace folder. The library compares real
  paths, so a symlink can't lead outside it.
- Workspace schemas with an `$id` go in a registry with their `file:` URI
  as the `retrievalUri`. An edit makes a new registry (`without` then
  `with`), which the next session is created with.
- Schemas without an `$id` are retrieved from their `file:` URIs. Files
  aren't HTTP cached, so a new session sees the edits.
- A new session for each change to the workspace sees a consistent snapshot,
  and the old one is dropped. Validators compiled in an old session have to
  be compiled again. The URIs a validator was compiled from (its kernel's handles)
  could be exposed for that.
