# Conformance alone doesn't justify a cost

Something the spec describes isn't worth complexity or speed if it's only
there to conform.

- There's no `keywordLocation`, the keyword location that follows
  references. It cost every evaluation with plugins a string for every
  keyword, and steps recorded in the compiled schema, for something that's
  rarely useful. A plugin that wants it can build it from `beforeSchema`
  and `afterSchema` (see [Plugins](../components/kernel/plugins.md)).
