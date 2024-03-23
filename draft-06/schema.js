import id from "../lib/keywords/id.js";
import items from "../lib/keywords/items.js";
import contains from "../lib/keywords/contains.js";
import additionalProperties from "../lib/keywords/additionalProperties.js";
import properties from "../lib/keywords/properties.js";
import patternProperties from "../lib/keywords/patternProperties.js";
import propertyNames from "../lib/keywords/propertyNames.js";
import allOf from "../lib/keywords/allOf.js";
import anyOf from "../lib/keywords/anyOf.js";
import oneOf from "../lib/keywords/oneOf.js";
import not from "../lib/keywords/not.js";


export default {
  "$schema": "http://json-schema.org/draft-06/schema#",
  "$id": "http://json-schema.org/draft-06/schema#",
  "title": "Core schema meta-schema",
  "definitions": {
    "schemaArray": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#" }
    },
    "nonNegativeInteger": {
      "type": "integer",
      "minimum": 0
    },
    "nonNegativeIntegerDefault0": {
      "allOf": [
        { "$ref": "#/definitions/nonNegativeInteger" },
        { "default": 0 }
      ]
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
  },
  "type": ["object", "boolean"],
  "properties": {
    "$id": {
      "type": "string",
      "format": "uri-reference",
      "description": id.description
    },
    "$schema": {
      "type": "string",
      "format": "uri",
      "description": `This keyword is both used as a JSON Schema dialect \
identifier and as a reference to a JSON Schema which describes the set \
of valid schemas written for this particular dialect.`
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference"
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "default": {},
    "examples": {
      "type": "array",
      "items": {}
    },
    "multipleOf": {
      "type": "number",
      "exclusiveMinimum": 0
    },
    "maximum": {
      "type": "number"
    },
    "exclusiveMaximum": {
      "type": "number"
    },
    "minimum": {
      "type": "number"
    },
    "exclusiveMinimum": {
      "type": "number"
    },
    "maxLength": { "$ref": "#/definitions/nonNegativeInteger" },
    "minLength": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
    "pattern": {
      "type": "string",
      "format": "regex"
    },
    "additionalItems": { "$ref": "#" },
    "items": {
      "anyOf": [
        { "$ref": "#" },
        { "$ref": "#/definitions/schemaArray" }
      ],
      "default": {},
      "description": items.description
    },
    "maxItems": { "$ref": "#/definitions/nonNegativeInteger" },
    "minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
    "uniqueItems": {
      "type": "boolean",
      "default": false
    },
    "contains": { "$ref": "#", "description": contains.description },
    "maxProperties": { "$ref": "#/definitions/nonNegativeInteger" },
    "minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
    "required": { "$ref": "#/definitions/stringArray" },
    "additionalProperties": { "$ref": "#", "description": additionalProperties.description },
    "definitions": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {}
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
      }
    },
    "propertyNames": { "$ref": "#", "description": propertyNames.description },
    "const": {},
    "enum": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true
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
      ]
    },
    "format": { "type": "string" },
    "allOf": { "$ref": "#/definitions/schemaArray", "description": allOf.description },
    "anyOf": { "$ref": "#/definitions/schemaArray", "description": anyOf.description },
    "oneOf": { "$ref": "#/definitions/schemaArray", "description": oneOf.description },
    "not": { "$ref": "#", "description": not.description }
  },
  "default": {}
};
