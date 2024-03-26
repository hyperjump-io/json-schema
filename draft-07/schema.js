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
import typeKeyword from "../lib/keywords/type.js";
import enumKeyword from "../lib/keywords/enum.js";
import pattern from "../lib/keywords/pattern.js";
import minLength from "../lib/keywords/minLength.js";
import maxLength from "../lib/keywords/maxLength.js";
import exclusiveMaximum from "../lib/keywords/exclusiveMaximum.js";
import multipleOf from "../lib/keywords/multipleOf.js";
import exclusiveMinimum from "../lib/keywords/exclusiveMinimum.js";
import maximum from "../lib/keywords/maximum.js";
import minimum from "../lib/keywords/minimum.js";
import maxProperties from "../lib/keywords/maxProperties.js";
import minProperties from "../lib/keywords/minProperties.js";
import required from "../lib/keywords/required.js";
import maxItems from "../lib/keywords/maxItems.js";
import minItems from "../lib/keywords/minItems.js";
import uniqueItems from "../lib/keywords/uniqueItems.js";
import title from "../lib/keywords/title.js";
import description from "../lib/keywords/description.js";
import writeOnly from "../lib/keywords/writeOnly.js";
import readOnly from "../lib/keywords/readOnly.js";
import examples from "../lib/keywords/examples.js";
import format from "../lib/keywords/format.js";
import contentMediaType from "../lib/keywords/contentMediaType.js";
import contentEncoding from "../lib/keywords/contentEncoding.js";


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
      "type": "string",
      "description": title.description
    },
    "description": {
      "type": "string",
      "description": description.description
    },
    "default": true,
    "readOnly": {
      "type": "boolean",
      "default": false,
      "description": readOnly.description
    },
    "writeOnly": {
      "type": "boolean",
      "default": false,
      "description": writeOnly.description
    },
    "examples": {
      "type": "array",
      "items": true,
      "description": examples.description
    },
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
    "maxLength": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }], "description": maxLength.description },
    "minLength": { "allOf": [{ "$ref": "#/definitions/nonNegativeIntegerDefault0" }], "description": minLength.description },
    "pattern": {
      "type": "string",
      "format": "regex",
      "description": pattern.description
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
    "maxItems": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }], "description": maxItems.description },
    "minItems": { "allOf": [{ "$ref": "#/definitions/nonNegativeIntegerDefault0" }], "description": minItems.description },
    "uniqueItems": {
      "type": "boolean",
      "default": false,
      "description": uniqueItems.description
    },
    "contains": { "allOf": [{ "$ref": "#" }], "description": contains.description },
    "maxProperties": { "allOf": [{ "$ref": "#/definitions/nonNegativeInteger" }], "description": maxProperties.description },
    "minProperties": { "allOf": [{ "$ref": "#/definitions/nonNegativeIntegerDefault0" }], "description": minProperties.description },
    "required": { "allOf": [{ "$ref": "#/definitions/stringArray" }], "description": required.description },
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
    "propertyNames": { "allOf": [{ "$ref": "#" }], "description": propertyNames.description },
    "const": true,
    "enum": {
      "type": "array",
      "items": true,
      "minItems": 1,
      "uniqueItems": true,
      "description": enumKeyword.description
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
      "description": typeKeyword.description
    },
    "format": { "type": "string", "description": format.description },
    "contentMediaType": { "type": "string", "description": contentMediaType.description },
    "contentEncoding": { "type": "string", "description": contentEncoding.description },
    "if": { "allOf": [{ "$ref": "#" }], "description": ifKeyword.description },
    "then": { "allOf": [{ "$ref": "#" }], "description": thenKeyword.description },
    "else": { "allOf": [{ "$ref": "#" }], "description": elseKeyword.description },
    "allOf": { "allOf": [{ "$ref": "#/definitions/schemaArray" }], "description": allOf.description },
    "anyOf": { "allOf": [{ "$ref": "#/definitions/schemaArray" }], "description": anyOf.description },
    "oneOf": { "allOf": [{ "$ref": "#/definitions/schemaArray" }], "description": oneOf.description },
    "not": { "allOf": [{ "$ref": "#" }], "description": not.description }
  },
  "default": true
};
