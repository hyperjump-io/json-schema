module.exports = `{
    "$id": "https://json-schema.org/draft/future/meta/format-assertion",
    "$schema": "https://json-schema.org/draft/future/schema",
    "$vocabulary": {
        "https://json-schema.org/draft/future/vocab/format-assertion": true
    },
    "$dynamicAnchor": "meta",

    "title": "Format vocabulary meta-schema for assertion results",
    "type": ["object", "boolean"],
    "properties": {
        "format": { "type": "string" }
    }
}`;
