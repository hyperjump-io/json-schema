# `check`

An optional hook that reports what the shape can't say about the keyword's
value, like `minLength` being negative or `allOf` being empty (see
[Schema validation](../../components/schema-validation.md)). Without it,
any value that fits the shape is allowed.

Its context has the keyword's siblings, the schema's dialect, and
`message`. The dialect is for what the dialect decides about the value,
like whether `format` names a format it supports when formats are
validated.
