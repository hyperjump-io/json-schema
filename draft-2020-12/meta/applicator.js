import prefixItems from "../../lib/keywords/prefixItems.js";
import items from "../../lib/keywords/items.js";
import contains from "../../lib/keywords/contains.js";
import additionalProperties from "../../lib/keywords/additionalProperties.js";
import properties from "../../lib/keywords/properties.js";
import patternProperties from "../../lib/keywords/patternProperties.js";
import dependentSchemas from "../../lib/keywords/dependentSchemas.js";
import propertyNames from "../../lib/keywords/propertyNames.js";
import _if from "../../lib/keywords/if.js";
import then from "../../lib/keywords/then.js";
import _else from "../../lib/keywords/else.js";
import allOf from "../../lib/keywords/allOf.js";
import anyOf from "../../lib/keywords/anyOf.js";
import oneOf from "../../lib/keywords/oneOf.js";
import not from "../../lib/keywords/not.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/applicator",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Applicator vocabulary meta-schema",
  "properties": {
    "prefixItems": {
      "$ref": "#/$defs/schemaArray",
      "description": prefixItems.description
    },
    "items": {
      "$dynamicRef": "#meta",
      "description": items.description
    },
    "contains": {
      "$dynamicRef": "#meta",
      "description": contains.description
    },
    "additionalProperties": {
      "$dynamicRef": "#meta",
      "description": additionalProperties.description
    },
    "properties": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "default": {},
      "description": properties.description
    },
    "patternProperties": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "propertyNames": { "format": "regex" },
      "default": {},
      "description": patternProperties.description
    },
    "dependentSchemas": {
      "type": "object",
      "additionalProperties": {
        "$dynamicRef": "#meta"
      },
      "description": dependentSchemas.description
    },
    "propertyNames": {
      "$dynamicRef": "#meta",
      "description": propertyNames.description
    },
    "if": {
      "$dynamicRef": "#meta",
      "description": _if.description
    },
    "then": {
      "$dynamicRef": "#meta",
      "description": then.description
    },
    "else": {
      "$dynamicRef": "#meta",
      "description": _else.description
    },
    "allOf": {
      "$ref": "#/$defs/schemaArray",
      "description": allOf.description
    },
    "anyOf": {
      "$ref": "#/$defs/schemaArray",
      "description": anyOf.description
    },
    "oneOf": {
      "$ref": "#/$defs/schemaArray",
      "description": oneOf.description
    },
    "not": {
      "$dynamicRef": "#meta",
      "description": not.description
    }
  },
  "$defs": {
    "schemaArray": {
      "type": "array",
      "minItems": 1,
      "items": { "$dynamicRef": "#meta" }
    }
  }
};
