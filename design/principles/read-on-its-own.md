# Each definition reads on its own

Duplication is sometimes the right choice. A definition that lists
everything it uses can be read, and changed, without looking anywhere else.

- Each preset imports and lists every keyword and format definition its
  dialect uses, and defines its own format names, even though most are the
  same in every preset. A shared list would hide what each one uses (see
  [Presets](../components/presets/README.md)).
- Output formats can share utility functions, but not a base class. Each
  format's plugin has all of its own hooks, so it reads on its own and can
  change without affecting the others (see
  [Output formats](../components/kernel/output-formats.md)).
