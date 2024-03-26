import title from "../../lib/keywords/title.js";
import description from "../../lib/keywords/description.js";
import writeOnly from "../../lib/keywords/writeOnly.js";
import readOnly from "../../lib/keywords/readOnly.js";
import examples from "../../lib/keywords/examples.js";
import deprecated from "../../lib/keywords/deprecated.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/meta-data",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Meta-data vocabulary meta-schema",

  "properties": {
    "title": {
      "type": "string",
      "description": title.description
    },
    "description": {
      "type": "string",
      "description": description.description
    },
    "default": true,
    "deprecated": {
      "type": "boolean",
      "default": false,
      "description": deprecated.description
    },
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
    }
  }
};
