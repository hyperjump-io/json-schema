# Formats

`format` validates by default in v1 and draft-04 through draft-07. It's only an
annotation in 2019-09 and 2020-12. The `validateFormats` config overrides the
dialect.

```javascript
const jsonSchema = new JsonSchema({ validateFormats: true });
```

Each preset adds the formats its dialect defines, except `hostname`,
`idn-hostname`, and `idn-email`. Those need large tables of Unicode data, so
they're only loaded if you ask for them. (draft-04 and draft-06 have their own
`hostname`, which doesn't.)

```javascript
import { addFullFormats } from "@hyperjump/json-schema/formats/full";

addFullFormats(jsonSchema);
```

The [`hjlint`](https://github.com/hyperjump-io/hjlint) CLI has every format.
