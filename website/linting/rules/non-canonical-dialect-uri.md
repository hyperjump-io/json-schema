# `non-canonical-dialect-uri`

In `recommended`, as a warning.

A `$schema` with a fragment that isn't empty, one that isn't normalized,
like `HTTP://json-schema.org/…`, or one for draft-04 through 2020-12 that
doesn't match the URI its meta-schema uses: with the empty fragment for
draft-04 through draft-07 (`http://json-schema.org/draft-07/schema#`),
and without it for 2019-09 and 2020-12. This implementation recovers, but
implementations that compare dialect URIs as strings won't recognize the
dialect. See [Dialects](../../../design/components/dialects/README.md) for why.

In v1, where a fragment or a URI that isn't normalized is invalid,
`invalid-dialect-uri` reports it too, as an error. It has no options.

## Examples

### Reported

#### draft-07 without the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "string"
}
```

> 'http://json-schema.org/draft-07/schema' should be 'http://json-schema.org/draft-07/schema#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

#### draft-04 without the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "string"
}
```

> 'http://json-schema.org/draft-04/schema' should be 'http://json-schema.org/draft-04/schema#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

#### 2020-12 with an empty fragment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema#",
  "type": "string"
}
```

> 'https://json-schema.org/draft/2020-12/schema#' should be 'https://json-schema.org/draft/2020-12/schema', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.

### Not reported

#### draft-07 with the empty fragment

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
```

#### 2020-12 without a fragment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```
