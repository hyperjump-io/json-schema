# Configuration comments

A `$comment` that starts with `jsonschema-lint-disable` turns rules off for the
schema it's in and its subschemas, and `jsonschema-lint-enable` turns them back
on. Name the rules after it, or name none for every rule. The innermost schema
with a directive for a rule decides. It works in every dialect, including
draft-04 and draft-06, which don't have `$comment`. Schema problems can't be
turned off.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$comment": "jsonschema-lint-disable then-else-without-if",
  "then": true,
  "properties": {
    "foo": { "$comment": "jsonschema-lint-enable then-else-without-if", "then": true }
  }
}
```

A directive that names a rule that isn't configured is a warning
(`unknown-rule`), and so is a misspelled directive (`unknown-directive`).
