import IdKeyword from "../../lib/keywords/id"

export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/core",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Core vocabulary meta-schema",
  "properties": {
    "$id": {
      "type": "string",
      "format": "uri-reference",
      "$comment": "Non-empty fragments not allowed.",
      "pattern": "^[^#]*#?$",
      "description": IdKeyword.description
    },
    "$schema": {
      "type": "string",
      "format": "uri",
      "description": "This keyword is both used as a JSON Schema dialect identifier and as a reference to a JSON Schema which describes the set of valid schemas written for this particular dialect."
    },
    "$anchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$"
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference",
    },
    "$dynamicRef": {
      "type": "string",
      "format": "uri-reference"
    },
    "$dynamicAnchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$"
    },
    "$vocabulary": {
      "type": "object",
      "propertyNames": {
        "type": "string",
        "format": "uri"
      },
      "additionalProperties": {
        "type": "boolean"
      }
    },
    "$comment": {
      "type": "string"
    },
    "$defs": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "default": {}
    }
  }
}
