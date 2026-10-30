# Choosing rules

Rules are configured as a list of plugins: presets and rules, each with an
optional setting. The list is the same everywhere: in the CLI's
[`.hyperjumprc`](https://github.com/hyperjump-io/cli/blob/main/website/configuration.md),
and in the `plugins` option of [`lint`](from-code.md).

```json
{
  "plugins": [
    "@hyperjump/json-schema/lint/recommended",
    ["@hyperjump/json-schema/lint/rules/then-else-without-if", ["error"]],
    [
      "@hyperjump/json-schema/lint/rules/type-implied-by-const-or-enum",
      ["off"]
    ]
  ]
}
```

## The recommended preset

`@hyperjump/json-schema/lint/recommended` turns on every rule. Start with
it, and turn off the ones you don't want. The [Rules](rules/README.md)
page lists them.

## Changing a rule

Each rule is `@hyperjump/json-schema/lint/rules/<name>`. A rule after the
preset changes what the preset set for it. Its setting is an array, with
the severity first:

| Severity | Meaning |
| --- | --- |
| `"off"` | Don't run the rule |
| `"warn"` | Report it as a warning. The CLI doesn't fail on warnings unless you use `--frail`. |
| `"error"` | Report it as an error |

A rule with options takes them after the severity. Each rule's page lists
its options.

```json
[
  "@hyperjump/json-schema/lint/rules/unknown-keyword",
  ["warn", { "ignore": ["x-internal"] }]
]
```

## Turning a rule off in one place

To keep a rule on but allow an exception, use a
[configuration comment](configuration-comments.md) in the schema instead
of turning the rule off everywhere.

## Your own rules

A rule is a unified plugin, so a package of your own can be in the list
too. See [Lint rules](../extending/lint-rules.md).
