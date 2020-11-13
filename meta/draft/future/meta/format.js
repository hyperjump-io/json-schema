module.exports = `{
    "$id": "https://json-schema.org/draft/future/meta/format",
    "$schema": "https://json-schema.org/draft/future/schema",
    "$vocabulary": {
        "https://json-schema.org/draft/future/vocab/format": true
    },
    "$dynamicAnchor": "meta",

    "title": "Format vocabulary meta-schema",
    "type": ["object", "boolean"],
    "properties": {
        "format": { "type": "string" }
    }
}`;
