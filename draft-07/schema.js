import id from "../lib/keywords/id.js";
import ref from "../lib/keywords/ref.js";
import definitions from "../lib/keywords/definitions.js";
import comment from "../lib/keywords/comment.js";
import items from "../lib/keywords/items.js";
import contains from "../lib/keywords/contains.js";
import additionalProperties from "../lib/keywords/additionalProperties.js";
import properties from "../lib/keywords/properties.js";
import patternProperties from "../lib/keywords/patternProperties.js";
import propertyNames from "../lib/keywords/propertyNames.js";
import ifKeyword from "../lib/keywords/if.js";
import thenKeyword from "../lib/keywords/then.js";
import elseKeyword from "../lib/keywords/else.js";
import allOf from "../lib/keywords/allOf.js";
import anyOf from "../lib/keywords/anyOf.js";
import oneOf from "../lib/keywords/oneOf.js";
import not from "../lib/keywords/not.js";


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
of valid schemas written for this particular dialect.`
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
      "default": true,
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
      "default": {},
      "discription": definitions.description
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
      "propertyNames": { "format": "regex" },
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
    "if": { "$ref": "#", "description": ifKeyword.description },
    "then": { "$ref": "#", "description": thenKeyword.description },
    "else": { "$ref": "#", "description": elseKeyword.description },
    "allOf": { "$ref": "#/definitions/schemaArray", "description": allOf.description },
    "anyOf": { "$ref": "#/definitions/schemaArray", "description": anyOf.description },
    "oneOf": { "$ref": "#/definitions/schemaArray", "description": oneOf.description },
    "not": { "$ref": "#", "description": not.description }
  },
  "default": true
};
