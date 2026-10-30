# Configuration comments

A configuration comment turns rules off or back on for part of a schema.
Use it for an exception you've decided is fine. The rule keeps checking
everywhere else.

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "object",
  "properties": {
    "legacy": {
      "$comment": "json-schema-lint-disable keyword-without-type",
      "properties": { "id": { "type": "string" } }
    }
  }
}
```

## How they work

- A `$comment` that starts with `json-schema-lint-disable` turns rules off
  for the schema it's in and every schema inside it.
- `json-schema-lint-enable` turns them back on.
- Name the rules after it, separated by spaces. If you don't name any, it
  applies to every rule.
- When nested schemas both have a comment for a rule, the innermost one
  wins.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$comment": "json-schema-lint-disable then-else-without-if",
  "then": true,
  "properties": {
    "foo": {
      "$comment": "json-schema-lint-enable then-else-without-if",
      "then": true
    }
  }
}
```

Here, the `then` at the root isn't reported, but the one in `foo` is.

It works in every dialect, including draft-04 and draft-06, which don't
have `$comment`. In those dialects, validation ignores `$comment` like any
unknown keyword, so adding it is safe.

Problems that make a schema invalid can't be turned off.

## Mistakes in comments

A comment that names a rule that isn't configured is reported as
`unknown-rule`. A misspelled directive, like `json-schema-lint-disabel`, is
reported as `unknown-directive`. Both are warnings. That way a comment that
does nothing doesn't go unnoticed.
