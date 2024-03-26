import format from "../../lib/keywords/format.js";


export default {
  "$id": "https://json-schema.org/draft/2019-09/meta/format",
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$recursiveAnchor": true,

  "title": "Format vocabulary meta-schema",
  "properties": {
    "format": { "type": "string", "description": format.description }
  }
};
