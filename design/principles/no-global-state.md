# No global state

Everything is per instance. v1 had global state (`registerSchema`,
`addKeyword`, `setShouldValidateFormat`, …), so two parts of an application
couldn't configure JSON Schema differently, and tests leaked into each
other.

- Keywords, formats, and dialects are added to a `JsonSchema`, not to the
  module.
- Definitions are plain, stateless objects, so one definition can be shared
  by every `JsonSchema` and every dialect. Anything instance-specific comes
  through a context argument (see [Keywords](../specs/keyword/README.md)).
- State is separated by how long it lives: the long-lived `JsonSchema` only
  has what doesn't depend on a session, and everything that depends on
  registries belongs to a session and goes away with it (see
  [Sessions](../components/sessions/README.md)).
