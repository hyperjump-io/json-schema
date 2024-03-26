import contentMediaType from "../../lib/keywords/contentMediaType.js";
import contentEncoding from "../../lib/keywords/contentEncoding.js";
import contentSchema from "../../lib/keywords/contentSchema.js";


export default {
  "$id": "https://json-schema.org/draft/2019-09/meta/content",
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$recursiveAnchor": true,

  "title": "Content vocabulary meta-schema",

  "properties": {
    "contentMediaType": { "type": "string", "description": contentMediaType.description },
    "contentEncoding": { "type": "string", "description": contentEncoding.description },
    "contentSchema": { "$recursiveRef": "#", "description": contentSchema.description }
  }
};
