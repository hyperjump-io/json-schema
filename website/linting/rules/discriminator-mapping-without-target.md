# `discriminator-mapping-without-target`

In `openapi-3-0`, as an error. In `openapi-3-1`, as an error. In
`openapi-3-2`, as an error.

A value in a `discriminator`'s `mapping`, or OpenAPI 3.2's
`defaultMapping`, that doesn't find a schema. A value is a schema name,
the name of a schema in `components.schemas`, or a URI reference to a
schema.

A value that could be a name is read as a name, as OpenAPI recommends. To
refer to a schema by a URI that looks like a name, such as `dog.json`,
write `./dog.json`. OpenAPI says you have to, and the message says how. A
URI reference to another document isn't checked, because linting doesn't
retrieve anything.

Only schemas in OpenAPI documents are checked, because a schema in a file
of its own has no schema names. It has no options.

## Examples

### Reported

#### A name that isn't a schema

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [{ "$ref": "#/components/schemas/Cat" }],
        "discriminator": {
          "propertyName": "petType",
          "mapping": { "cat": "Cat", "bird": "Bird" }
        }
      },
      "Cat": { "type": "object" }
    }
  }
}
```

> 'mapping' for 'bird' is 'Bird', which isn't a schema name in 'components.schemas' or a URI reference to a schema. To refer to a schema by its URI, write './Bird'.

#### A reference to something that isn't a schema

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [{ "$ref": "#/components/schemas/Cat" }],
        "discriminator": {
          "propertyName": "petType",
          "mapping": { "cat": "#/components/schemas/Kat" }
        }
      },
      "Cat": { "type": "object" }
    }
  }
}
```

> 'mapping' for 'cat' is '#/components/schemas/Kat', which isn't a schema name in 'components.schemas' or a URI reference to a schema.

### Not reported

#### Names and references

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
        "discriminator": {
          "propertyName": "petType",
          "mapping": { "cat": "Cat", "dog": "#/components/schemas/Dog" }
        }
      },
      "Cat": { "type": "object" },
      "Dog": { "type": "object" }
    }
  }
}
```

#### Another document

```json
{
  "openapi": "3.0.4",
  "info": { "title": "Pets", "version": "1" },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [{ "$ref": "./schemas/bird.json" }],
        "discriminator": {
          "propertyName": "petType",
          "mapping": { "bird": "./schemas/bird.json" }
        }
      }
    }
  }
}
```
