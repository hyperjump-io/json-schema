import id from "../draft-04/id.js";
import title from "../lib/keywords/title.js";
import description from "../lib/keywords/description.js";
import _default from "../lib/keywords/default.js";
import multipleOf from "../lib/keywords/multipleOf.js";
import maximum from "./maximum.js";
import exclusiveMaximum from "./exclusiveMaximum.js";
import minimum from "./minimum.js";
import exclusiveMinimum from "./exclusiveMinimum.js";
import maxLength from "../lib/keywords/maxLength.js";
import minLength from "../lib/keywords/minLength.js";
import pattern from "../lib/keywords/pattern.js";
import additionalItems from "./additionalItems.js";
import items from "./items.js";
import maxItems from "../lib/keywords/maxItems.js";
import minItems from "../lib/keywords/minItems.js";
import uniqueItems from "../lib/keywords/uniqueItems.js";
import maxProperties from "../lib/keywords/maxProperties.js";
import minProperties from "../lib/keywords/minProperties.js";
import required from "../lib/keywords/required.js";
import additionalProperties from "../lib/keywords/additionalProperties.js";
import definitions from "../lib/keywords/definitions.js";
import properties from "../lib/keywords/properties.js";
import patternProperties from "../lib/keywords/patternProperties.js";
import dependencies from "./dependencies.js";
import _enum from "../lib/keywords/enum.js";
import type from "../lib/keywords/type.js";
import format from "../lib/keywords/format.js";
import allOf from "../lib/keywords/allOf.js";
import anyOf from "../lib/keywords/anyOf.js";
import oneOf from "../lib/keywords/oneOf.js";
import not from "../lib/keywords/not.js";


export default {
  "id": "http://json-schema.org/draft-04/schema#",
  "$schema": "http://json-schema.org/draft-04/schema#",
  "description": "Core schema meta-schema",
  "definitions": {
    "schemaArray": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#" }
    },
    "positiveInteger": {
      "type": "integer",
      "minimum": 0
    },
    "positiveIntegerDefault0": {
      "allOf": [{ "$ref": "#/definitions/positiveInteger" }, { "default": 0 }]
    },
    "simpleTypes": {
      "enum": ["array", "boolean", "integer", "null", "number", "object", "string"]
    },
    "stringArray": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "uniqueItems": true
    }
  },
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": id.description
    },
    "$schema": {
      "type": "string",
      "description": `This keyword is both used as a JSON Schema dialect \
identifier and as a reference to a JSON Schema which describes the set \
of valid schemas written for this particular dialect.`
    },
    "title": {
      "type": "string",
      "description": title.description
    },
    "description": {
      "type": "string",
      "description": description.description
    },
    "default": {
      "description": _default.description
    },
    "multipleOf": {
      "type": "number",
      "minimum": 0,
      "exclusiveMinimum": true,
      "description": multipleOf.description
    },
    "maximum": {
      "type": "number",
      "description": maximum.description
    },
    "exclusiveMaximum": {
      "type": "boolean",
      "default": false,
      "description": exclusiveMaximum.description
    },
    "minimum": {
      "type": "number",
      "description": minimum.description
    },
    "exclusiveMinimum": {
      "type": "boolean",
      "default": false,
      "description": exclusiveMinimum.description
    },
    "maxLength": {
      "allOf": [{ "$ref": "#/definitions/positiveInteger" }],
      "description": maxLength.description
    },
    "minLength": {
      "allOf": [{ "$ref": "#/definitions/positiveIntegerDefault0" }],
      "description": minLength.description
    },
    "pattern": {
      "type": "string",
      "format": "regex",
      "description": pattern.description
    },
    "additionalItems": {
      "anyOf": [
        { "type": "boolean" },
        { "$ref": "#" }
      ],
      "default": {},
      "description": additionalItems.description
    },
    "items": {
      "anyOf": [
        { "$ref": "#" },
        { "$ref": "#/definitions/schemaArray" }
      ],
      "default": {},
      "description": items.description
    },
    "maxItems": {
      "allOf": [{ "$ref": "#/definitions/positiveInteger" }],
      "description": maxItems.description
    },
    "minItems": {
      "allOf": [{ "$ref": "#/definitions/positiveIntegerDefault0" }],
      "description": minItems.description
    },
    "uniqueItems": {
      "type": "boolean",
      "default": false,
      "description": uniqueItems.description
    },
    "maxProperties": {
      "allOf": [
        { "$ref": "#/definitions/positiveIntegerDefault0" },
        { "$ref": "#/definitions/positiveInteger" }
      ],
      "description": maxProperties.description
    },
    "minProperties": {
      "allOf": [{ "$ref": "#/definitions/positiveIntegerDefault0" }],
      "description": minProperties.description
    },
    "required": {
      "allOf": [{ "$ref": "#/definitions/stringArray" }],
      "description": required.description
    },
    "additionalProperties": {
      "anyOf": [
        { "type": "boolean" },
        { "$ref": "#" }
      ],
      "default": {},
      "description": additionalProperties.description
    },
    "definitions": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {},
      "description": definitions.description
    },
    "properties": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {},
      "description": properties.description
    },
    "patternProperties": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {},
      "description": patternProperties.description
    },
    "dependencies": {
      "type": "object",
      "additionalProperties": {
        "anyOf": [
          { "$ref": "#" },
          { "$ref": "#/definitions/stringArray" }
        ]
      },
      "description": dependencies.description
    },
    "enum": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "description": _enum.description
    },
    "type": {
      "anyOf": [
        { "$ref": "#/definitions/simpleTypes" },
        {
          "type": "array",
          "items": { "$ref": "#/definitions/simpleTypes" },
          "minItems": 1,
          "uniqueItems": true
        }
      ],
      "description": type.description
    },
    "format": { "type": "string", "description": format.description },
    "allOf": {
      "allOf": [{ "$ref": "#/definitions/schemaArray" }],
      "description": allOf.description
    },
    "anyOf": {
      "allOf": [{ "$ref": "#/definitions/schemaArray" }],
      "description": anyOf.description
    },
    "oneOf": {
      "allOf": [{ "$ref": "#/definitions/schemaArray" }],
      "description": oneOf.description
    },
    "not": {
      "allOf": [{ "$ref": "#" }],
      "description": not.description
    }
  },
  "dependencies": {
    "exclusiveMaximum": ["maximum"],
    "exclusiveMinimum": ["minimum"]
  },
  "default": {}
};
