# `discriminator-without-composition`

In `openapi-3-0`, as an error. In `openapi-3-1`, as an error. In
`openapi-3-2`, as an error.

A `discriminator` in an OpenAPI document whose schema has no `oneOf`,
`anyOf`, or `allOf`, and that no `allOf` in the document refers to.
OpenAPI says a discriminator is only allowed with one of those. It picks
which of the `oneOf` or `anyOf` schemas applies, or which of the schemas
that build on it with `allOf`. Without any of them, there's nothing for it
to pick. Validation doesn't use it, so the schema still works.

Only schemas in OpenAPI documents are checked. A schema in a file of its
own can be built on by schemas in other files, which the rule can't see.
It has no options.

## Examples

### Reported

#### Nothing to pick from

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "discriminator": { "propertyName": "petType" }
      }
    }
  }
}
```

> 'discriminator' is only allowed with 'oneOf', 'anyOf', or 'allOf' next to it, or in a schema that an 'allOf' refers to

### Not reported

#### With alternatives to pick from

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [
          { "$ref": "#/components/schemas/Cat" },
          { "$ref": "#/components/schemas/Dog" }
        ],
        "discriminator": { "propertyName": "petType" }
      },
      "Cat": { "type": "object" },
      "Dog": { "type": "object" }
    }
  }
}
```

#### A parent that other schemas build on

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "type": "object",
        "discriminator": { "propertyName": "petType" }
      },
      "Cat": {
        "allOf": [{ "$ref": "#/components/schemas/Pet" }]
      }
    }
  }
}
```
