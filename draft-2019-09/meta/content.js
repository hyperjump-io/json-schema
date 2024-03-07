export default {
  "$id": "https://json-schema.org/draft/2019-09/meta/content",
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$recursiveAnchor": true,

  "title": "Content vocabulary meta-schema",

  "type": ["object", "boolean"],
  "properties": {
    "contentMediaType": { "type": "string" },
    "contentEncoding": { "type": "string" },
    "contentSchema": { "$recursiveRef": "#" }
  }
};
