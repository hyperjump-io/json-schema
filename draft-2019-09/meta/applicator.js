import additionalItems from "../../draft-04/additionalItems.js";
import unevaluatedItems from "../../lib/keywords/unevaluatedItems.js";
import items from "../../draft-04/items.js";
import contains from "../../lib/keywords/contains.js";
import additionalProperties from "../../lib/keywords/additionalProperties.js";
import unevaluatedProperties from "../../lib/keywords/unevaluatedProperties.js";
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
  "$id": "https://json-schema.org/draft/2019-09/meta/applicator",
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$recursiveAnchor": true,

  "title": "Applicator vocabulary meta-schema",
  "properties": {
    "additionalItems": {
      "$recursiveRef": "#",
      "description": additionalItems.description
    },
    "unevaluatedItems": {
      "$recursiveRef": "#",
      "description": unevaluatedItems.description
    },
    "items": {
      "anyOf": [
        { "$recursiveRef": "#" },
        { "$ref": "#/$defs/schemaArray" }
      ],
      "description": items.description
    },
    "contains": {
      "$recursiveRef": "#",
      "description": contains.description
    },
    "additionalProperties": {
      "$recursiveRef": "#",
      "description": additionalProperties.description
    },
    "unevaluatedProperties": {
      "$recursiveRef": "#",
      "description": unevaluatedProperties.description
    },
    "properties": {
      "type": "object",
      "additionalProperties": { "$recursiveRef": "#" },
      "default": {},
      "description": properties.description
    },
    "patternProperties": {
      "type": "object",
      "additionalProperties": { "$recursiveRef": "#" },
      "propertyNames": { "format": "regex" },
      "default": {},
      "description": patternProperties.description
    },
    "dependentSchemas": {
      "type": "object",
      "additionalProperties": {
        "$recursiveRef": "#"
      },
      "description": dependentSchemas.description
    },
    "propertyNames": {
      "$recursiveRef": "#",
      "description": propertyNames.description
    },
    "if": {
      "$recursiveRef": "#",
      "description": _if.description
    },
    "then": {
      "$recursiveRef": "#",
      "description": then.description
    },
    "else": {
      "$recursiveRef": "#",
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
      "$recursiveRef": "#",
      "description": not.description
    }
  },
  "$defs": {
    "schemaArray": {
      "type": "array",
      "minItems": 1,
      "items": { "$recursiveRef": "#" }
    }
  }
};
