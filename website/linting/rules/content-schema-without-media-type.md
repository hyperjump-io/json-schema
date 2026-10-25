# `content-schema-without-media-type`

In `recommended`, as a warning.

`contentSchema` without a sibling `contentMediaType`. `contentSchema`
describes a string's content once it's been interpreted as the media
type, so without one, it isn't an annotation. The specs say it should be
ignored, so it's lint.

It finds the keywords by URI, so it works in every dialect with
`contentSchema` (2019-09 and later). It has no options.

## Examples

### Reported

#### contentSchema without contentMediaType

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "contentSchema": { "type": "object" }
}
```

> 'contentSchema' has no effect without 'contentMediaType'

### Not reported

#### contentSchema with contentMediaType

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "contentMediaType": "application/json",
  "contentSchema": { "type": "object" }
}
```

#### draft-07 doesn't have contentSchema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "contentSchema": true
}
```
