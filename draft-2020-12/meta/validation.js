import typeKeyword from "../../lib/keywords/type.js";
import enumKeyword from "../../lib/keywords/enum.js";
import pattern from "../../lib/keywords/pattern.js";
import minLength from "../../lib/keywords/minLength.js";
import maxLength from "../../lib/keywords/maxLength.js";
import exclusiveMaximum from "../../lib/keywords/exclusiveMaximum.js";
import multipleOf from "../../lib/keywords/multipleOf.js";
import exclusiveMinimum from "../../lib/keywords/exclusiveMinimum.js";
import maximum from "../../lib/keywords/maximum.js";
import minimum from "../../lib/keywords/minimum.js";
import dependentRequired from "../../lib/keywords/dependentRequired.js";
import maxProperties from "../../lib/keywords/maxProperties.js";
import minProperties from "../../lib/keywords/minProperties.js";
import required from "../../lib/keywords/required.js";
import maxItems from "../../lib/keywords/maxItems.js";
import minItems from "../../lib/keywords/minItems.js";
import maxContains from "../../lib/keywords/maxContains.js";
import minContains from "../../lib/keywords/minContains.js";
import uniqueItems from "../../lib/keywords/uniqueItems.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/validation",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Validation vocabulary meta-schema",
  "properties": {
    "multipleOf": {
      "type": "number",
      "exclusiveMinimum": 0,
      "description": multipleOf.description
    },
    "maximum": {
      "type": "number",
      "description": maximum.description
    },
    "exclusiveMaximum": {
      "type": "number",
      "description": exclusiveMaximum.description
    },
    "minimum": {
      "type": "number",
      "description": minimum.description
    },
    "exclusiveMinimum": {
      "type": "number",
      "description": exclusiveMinimum.description
    },
    "maxLength": { "$ref": "#/$defs/nonNegativeInteger", "description": maxLength.description },
    "minLength": { "$ref": "#/$defs/nonNegativeIntegerDefault0", "description": minLength.description },
    "pattern": {
      "type": "string",
      "format": "regex",
      "description": pattern.description
    },
    "maxItems": { "$ref": "#/$defs/nonNegativeInteger", "description": maxItems.description },
    "minItems": { "$ref": "#/$defs/nonNegativeIntegerDefault0", "description": minItems.description },
    "uniqueItems": {
      "type": "boolean",
      "default": false,
      "description": uniqueItems.description
    },
    "maxContains": { "$ref": "#/$defs/nonNegativeInteger", "description": maxContains.description },
    "minContains": {
      "$ref": "#/$defs/nonNegativeInteger",
      "default": 1,
      "description": minContains.description
    },
    "maxProperties": { "$ref": "#/$defs/nonNegativeInteger", "description": maxProperties.description },
    "minProperties": { "$ref": "#/$defs/nonNegativeIntegerDefault0", "description": minProperties.description },
    "required": { "$ref": "#/$defs/stringArray", "description": required.description },
    "dependentRequired": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/$defs/stringArray"
      },
      "description": dependentRequired.description
    },
    "const": true,
    "enum": {
      "type": "array",
      "items": true,
      "description": enumKeyword.description
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
      ],
      "description": typeKeyword.description
    }
  },
  "$defs": {
    "nonNegativeInteger": {
      "type": "integer",
      "minimum": 0
    },
    "nonNegativeIntegerDefault0": {
      "$ref": "#/$defs/nonNegativeInteger",
      "default": 0
    },
    "simpleTypes": {
      "enum": [
        "array",
        "boolean",
        "integer",
        "null",
        "number",
        "object",
        "string"
      ]
    },
    "stringArray": {
      "type": "array",
      "items": { "type": "string" },
      "uniqueItems": true,
      "default": []
    }
  }
};
