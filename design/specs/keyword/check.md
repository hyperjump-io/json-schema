# `check`

An optional hook that reports what the shape can't say about the keyword's
value, like `minLength` being negative or `allOf` being empty (see
[Schema validation](../../components/schema-validation.md)). Without it,
any value that fits the shape is allowed.
