import id from "../../lib/keywords/id.js";
import anchor from "../../lib/keywords/anchor.js";
import ref from "../../lib/keywords/ref.js";
import dynamicRef from "../../lib/keywords/dynamicRef.js";
import dynamicAnchor from "../../lib/keywords/dynamicAnchor.js";
import vocabulary from "../../lib/keywords/vocabulary.js";
import comment from "../../lib/keywords/comment.js";
import definitions from "../../lib/keywords/definitions.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/core",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Core vocabulary meta-schema",
  "properties": {
    "$id": {
      "type": "string",
      "format": "uri-reference",
      "$comment": "Non-empty fragments not allowed.",
      "pattern": "^[^#]*#?$",
      "description": id.description
    },
    "$schema": {
      "type": "string",
      "format": "uri",
      "description": "This keyword is both used as a JSON Schema dialect identifier and as a reference to a JSON Schema which describes the set of valid schemas written for this particular dialect."
    },
    "$anchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$",
      "description": anchor.description
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference",
      "description": ref.description
    },
    "$dynamicRef": {
      "type": "string",
      "format": "uri-reference",
      "description": dynamicRef.description
    },
    "$dynamicAnchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$",
      "description": dynamicAnchor.description
    },
    "$vocabulary": {
      "type": "object",
      "description": vocabulary.description,
      "propertyNames": {
        "type": "string",
        "format": "uri"
      },
      "additionalProperties": {
        "type": "boolean"
      }
    },
    "$comment": {
      "type": "string",
      "description": comment.description
    },
    "$defs": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "default": {},
      "description": definitions.description
    }
  }
};
