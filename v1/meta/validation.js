export default {
  "$schema": "https://json-schema.org/v1",
  "title": "Validation vocabulary meta-schema",

  "properties": {
    "multipleOf": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "maximum": { "type": "number" },
    "exclusiveMaximum": { "type": "number" },
    "minimum": { "type": "number" },
    "exclusiveMinimum": { "type": "number" },
    "maxLength": { "$ref": "#/$defs/nonNegativeInteger" },
    "minLength": { "$ref": "#/$defs/nonNegativeInteger" },
    "pattern": {
      "type": "string",
      "format": "regex"
    },
    "maxItems": { "$ref": "#/$defs/nonNegativeInteger" },
    "minItems": { "$ref": "#/$defs/nonNegativeInteger" },
    "uniqueItems": { "type": "boolean" },
    "maxContains": { "$ref": "#/$defs/nonNegativeInteger" },
    "minContains": { "$ref": "#/$defs/nonNegativeInteger" },
    "maxProperties": { "$ref": "#/$defs/nonNegativeInteger" },
    "minProperties": { "$ref": "#/$defs/nonNegativeInteger" },
    "required": { "$ref": "#/$defs/stringArray" },
    "optional": { "$ref": "#/$defs/stringArray" },
    "dependentRequired": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/stringArray" }
    },
    "const": true,
    "enum": {
      "type": "array",
      "items": true
    },
    "type": {
      "anyOf": [
        { "$ref": "#/$defs/simpleTypes" },
        {
          "type": "array",
          "items": { "$ref": "#/$defs/simpleTypes" },
          "minItems": 1,
          "uniqueItems": true
        }
      ]
    }
  },

  "$defs": {
    "nonNegativeInteger": {
      "type": "integer",
      "minimum": 0
    },
    "simpleTypes": {
      "enum": ["array", "boolean", "integer", "null", "number", "object", "string"]
    },
    "stringArray": {
      "type": "array",
      "items": { "type": "string" },
      "uniqueItems": true
    }
  }
};
