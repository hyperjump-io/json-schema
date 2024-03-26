import id from "../../lib/keywords/id.js";
import ref from "../../lib/keywords/ref.js";
import definitions from "../../lib/keywords/definitions.js";
import comment from "../../lib/keywords/comment.js";
import vocabulary from "../../lib/keywords/vocabulary.js";
import anchor from "../../lib/keywords/anchor.js";


export default {
  "$id": "https://json-schema.org/draft/2019-09/meta/core",
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$recursiveAnchor": true,

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
      "description": `This keyword is both used as a JSON Schema dialect \
identifier and as a reference to a JSON Schema which describes the set \
of valid schemas written for this particular dialect.`
    },
    "$anchor": {
      "type": "string",
      "pattern": "^[A-Za-z][-A-Za-z0-9.:_]*$",
      "description": anchor.description
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference",
      "description": ref.description
    },
    "$recursiveRef": {
      "type": "string",
      "format": "uri-reference"
    },
    "$recursiveAnchor": {
      "type": "boolean",
      "default": false
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
      "additionalProperties": { "$recursiveRef": "#" },
      "default": {},
      "description": definitions.description
    }
  }
};
