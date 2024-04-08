import allOfKeyword from "../../lib/keywords/allOf.js";
import anyOfKeyword from "../../lib/keywords/anyOf.js";
import oneOfKeyword from "../../lib/keywords/oneOf.js";
import thenKeyword from "../../lib/keywords/then.js";
import ifKeyword from "../../lib/keywords/if.js";
import elseKeyword from "../../lib/keywords/else.js";
import notKeyword from "../../lib/keywords/not.js";
import propertiesKeyword from "../../lib/keywords/properties.js";
import additionalPropertiesKeyword from "../../lib/keywords/additionalProperties.js";
import patternPropertiesKeyword from "../../lib/keywords/patternProperties.js";
import dependentSchemasKeyword from "../../lib/keywords/dependentSchemas.js";
import propertyNamesKeyword from "../../lib/keywords/propertyNames.js";
import itemsKeyword from "../../lib/keywords/items.js";
import prefixItemsKeyword from "../../lib/keywords/prefixItems.js";
import containsKeyword from "../../lib/keywords/contains.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/applicator",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Applicator vocabulary meta-schema",
  "properties": {
    "prefixItems": {
      "$ref": "#/$defs/schemaArray",
      "description": prefixItemsKeyword.description
    },
    "items": {
      "$dynamicRef": "#meta",
      "description": itemsKeyword.description
    },
    "contains": {
      "$dynamicRef": "#meta",
      "description": containsKeyword.description
    },
    "additionalProperties": {
      "$dynamicRef": "#meta",
      "description": additionalPropertiesKeyword.description
    },
    "properties": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "default": {},
      "description": propertiesKeyword.description
    },
    "patternProperties": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "propertyNames": { "format": "regex" },
      "default": {},
      "description": patternPropertiesKeyword.description
    },
    "dependentSchemas": {
      "type": "object",
      "additionalProperties": {
        "$dynamicRef": "#meta"
      },
      "description": dependentSchemasKeyword.description
    },
    "propertyNames": {
      "$dynamicRef": "#meta",
      "description": propertyNamesKeyword.description
    },
    "if": {
      "$dynamicRef": "#meta",
      "description": ifKeyword.description
    },
    "then": {
      "$dynamicRef": "#meta",
      "description": thenKeyword.description
    },
    "else": {
      "$dynamicRef": "#meta",
      "description": elseKeyword.description
    },
    "allOf": {
      "$ref": "#/$defs/schemaArray",
      "description": allOfKeyword.description
    },
    "anyOf": {
      "$ref": "#/$defs/schemaArray",
      "description": anyOfKeyword.description
    },
    "oneOf": {
      "$ref": "#/$defs/schemaArray",
      "description": oneOfKeyword.description
    },
    "not": {
      "$dynamicRef": "#meta",
      "description": notKeyword.description
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
