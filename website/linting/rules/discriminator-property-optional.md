# `discriminator-property-optional`

In `openapi-3-0`, as a warning. In `openapi-3-1`, as a warning. In
`openapi-3-2`, as an error.

A `discriminator` whose property is optional. OpenAPI 3.0 and 3.1 say the
property should be required, because what a discriminator does for an
object without it is undefined. OpenAPI 3.2 allows it to be optional, but
then the discriminator has to say which schema applies to objects without
it, with `defaultMapping`. So in 3.2, it's only reported without one.

The property is required if every valid object has it. `required` next to
the `discriminator` counts, and so does every `oneOf` alternative
requiring it. An alternative in a file that can't be retrieved is taken to
allow any properties. It has no options.

## Examples

### Reported

#### An optional property in OpenAPI 3.0

```json
{
  "openapi": "3.0.4",
  "info": {
    "title": "Pets",
    "version": "1"
  },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [
          {
            "$ref": "#/components/schemas/Cat"
          },
          {
            "$ref": "#/components/schemas/Dog"
          }
        ],
        "discriminator": {
          "propertyName": "petType"
        }
      },
      "Cat": {
        "type": "object"
      },
      "Dog": {
        "type": "object"
      }
    }
  }
}
```

> 'petType' is optional, and what 'discriminator' does without it is undefined. Make it required.

#### An optional property in OpenAPI 3.2 without a default

```json
{
  "openapi": "3.2.0",
  "info": {
    "title": "Pets",
    "version": "1"
  },
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [
          {
            "$ref": "#/components/schemas/Cat"
          },
          {
            "$ref": "#/components/schemas/Dog"
          }
        ],
        "discriminator": {
          "propertyName": "petType"
        }
      },
      "Cat": {
        "type": "object",
        "required": [
          "petType"
        ]
      },
      "Dog": {
        "type": "object"
      }
    }
  }
}
```

> 'petType' is optional, so 'discriminator' needs 'defaultMapping' for objects without it

### Not reported

#### Required

```json
{
  "openapi": "3.0.4",
  "info": {
    "title": "Pets",
    "version": "1"
  },
  "paths": {},
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [
          {
            "$ref": "#/components/schemas/Cat"
          },
          {
            "$ref": "#/components/schemas/Dog"
          }
        ],
        "required": [
          "petType"
        ],
        "discriminator": {
          "propertyName": "petType"
        }
      },
      "Cat": {
        "type": "object"
      },
      "Dog": {
        "type": "object"
      }
    }
  }
}
```

#### An optional property in OpenAPI 3.2 with a default

```json
{
  "openapi": "3.2.0",
  "info": {
    "title": "Pets",
    "version": "1"
  },
  "components": {
    "schemas": {
      "Pet": {
        "oneOf": [
          {
            "$ref": "#/components/schemas/Cat"
          },
          {
            "$ref": "#/components/schemas/OtherPet"
          }
        ],
        "discriminator": {
          "propertyName": "petType",
          "defaultMapping": "OtherPet"
        }
      },
      "Cat": {
        "type": "object",
        "required": [
          "petType"
        ]
      },
      "OtherPet": {
        "type": "object"
      }
    }
  }
}
```
