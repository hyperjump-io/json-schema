# Schemas aren't trusted

A schema shouldn't be able to make an application do something it didn't
choose to, like retrieve an internal address or a file outside the project.
Code is trusted: the application, its plugins, and the code that adds to a
registry.

- Only what the application allows is retrieved, and the default allows
  only what's local to it (see
  [`allowRetrieval`](../components/sessions/allow-retrieval.md)).
- A schema that wasn't retrieved from a `file:` URI can't be identified by
  one (see [Schema validation](../components/schema-validation.md)).
- Request headers are a function of the URL, so credentials only go where
  they belong (see browser's
  [Request headers](https://github.com/hyperjump-io/browser/blob/v2/design/components/request-headers.md)).
- Lint rules use the session they're given, so a schema can't make a rule
  retrieve what it names (see [Other schemas](../components/lint/other-schemas.md)).
- Plugins are code, so nothing stops a plugin that sets out to get around
  this.
