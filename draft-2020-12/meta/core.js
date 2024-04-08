import idKeyword from "../../lib/keywords/id.js";
import refKeyword from "../../lib/keywords/ref.js";
import anchorKeyword from "../../lib/keywords/anchor.js";
import dynamicAnchorKeyword from "../../lib/keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../lib/keywords/dynamicRef.js";
import vocabularyKeyword from "../../lib/keywords/vocabulary.js";
import commentKeyword from "../../lib/keywords/comment.js";
import definitionsKeyword from "../../lib/keywords/definitions.js";


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
      "description": idKeyword.description
    },
    "$schema": {
      "type": "string",
      "format": "uri",
      "description": "This keyword is both used as a JSON Schema dialect identifier and as a reference to a JSON Schema which describes the set of valid schemas written for this particular dialect."
    },
    "$anchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$",
      "description": anchorKeyword.description
    },
    "$ref": {
      "type": "string",
      "format": "uri-reference",
      "description": refKeyword.description
    },
    "$dynamicRef": {
      "type": "string",
      "format": "uri-reference",
      "description": dynamicRefKeyword.description
    },
    "$dynamicAnchor": {
      "type": "string",
      "pattern": "^[A-Za-z_][-A-Za-z0-9._]*$",
      "description": dynamicAnchorKeyword.description
    },
    "$vocabulary": {
      "type": "object",
      "description": vocabularyKeyword.description,
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
      "description": commentKeyword.description
    },
    "$defs": {
      "type": "object",
      "additionalProperties": { "$dynamicRef": "#meta" },
      "default": {},
      "description": definitionsKeyword.description
    }
  }
};
