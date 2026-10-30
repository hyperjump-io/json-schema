# `content-schema-without-media-type`

In `recommended`, as a warning.

`contentSchema` without a sibling `contentMediaType`. `contentSchema`
describes a string's content after it's been interpreted as the media
type. Without a media type, it isn't an annotation. The specs say it
should be ignored, so this is a lint rule rather than an error.

It finds the keywords by URI, so it works in every dialect that has
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
