import id from "../../lib/keywords/id.js"
import ref from "../..lib/keywords/ref.js"
import definitions from "../lib/keywords/definitions.js";
import comment from "../lib/keywords/comment.js";

export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://json-schema.org/draft-07/schema#",
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
of valid schemas written for this particular dialect.`,
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference",
      "discription": ref.description
    },
    "$comment": {
      "type": "string",
      "discription": comment.description
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "default": true,
    "readOnly": {
      "type": "boolean",
      "default": false
    },
    "writeOnly": {
      "type": "boolean",
      "default": false
    },
    "examples": {
      "type": "array",
      "items": true
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
      "default": true
    },
    "maxItems": { "$ref": "#/definitions/nonNegativeInteger" },
    "minItems": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
    "uniqueItems": {
      "type": "boolean",
      "default": false
    },
    "contains": { "$ref": "#" },
    "maxProperties": { "$ref": "#/definitions/nonNegativeInteger" },
    "minProperties": { "$ref": "#/definitions/nonNegativeIntegerDefault0" },
    "required": { "$ref": "#/definitions/stringArray" },
    "additionalProperties": { "$ref": "#" },
    "definitions": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {},
      "discription": definitions.description
    },
    "properties": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "default": {}
    },
    "patternProperties": {
      "type": "object",
      "additionalProperties": { "$ref": "#" },
      "propertyNames": { "format": "regex" },
      "default": {}
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
    "propertyNames": { "$ref": "#" },
    "const": true,
    "enum": {
      "type": "array",
      "items": true,
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
    "contentMediaType": { "type": "string" },
    "contentEncoding": { "type": "string" },
    "if": { "$ref": "#" },
    "then": { "$ref": "#" },
    "else": { "$ref": "#" },
    "allOf": { "$ref": "#/definitions/schemaArray" },
    "anyOf": { "$ref": "#/definitions/schemaArray" },
    "oneOf": { "$ref": "#/definitions/schemaArray" },
    "not": { "$ref": "#" }
  },
  "default": true
};
