module.exports = `{
    "$id": "https://json-schema.org/draft/future/meta/content",
    "$schema": "https://json-schema.org/draft/future/schema",
    "$vocabulary": {
        "https://json-schema.org/draft/future/vocab/content": true
    },
    "$dynamicAnchor": "meta",

    "title": "Content vocabulary meta-schema",

    "type": ["object", "boolean"],
    "properties": {
        "contentMediaType": { "type": "string" },
        "contentEncoding": { "type": "string" },
        "contentSchema": { "$dynamicRef": "#meta" }
    }
}`;
