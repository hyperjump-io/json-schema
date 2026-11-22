# `discriminator-property-optional-without-default`

In `openapi-3-2`, as an error.

An OpenAPI 3.2 `discriminator` without `defaultMapping` whose property is
optional. OpenAPI 3.2 says a discriminator for an optional property has to
say which schema applies to objects that don't have it, with
`defaultMapping`.

The property is required if every valid object has it. `required` next to
the `discriminator` counts, and so does every `oneOf` alternative
requiring it. An alternative in a file that can't be retrieved is taken to
allow any properties. It's only for OpenAPI 3.2, which has
`defaultMapping`, and it has no options.

## Examples

### Reported

#### An optional property

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

#### Every alternative requires it

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
        "type": "object",
        "required": [
          "petType"
        ]
      }
    }
  }
}
```

#### With a default

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
