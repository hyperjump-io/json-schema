export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/content",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Content vocabulary meta-schema",

  "properties": {
    "contentMediaType": { "type": "string" },
    "contentEncoding": { "type": "string" },
    "contentSchema": { "$dynamicRef": "#meta" }
  }
};
