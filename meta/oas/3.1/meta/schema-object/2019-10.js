module.exports = `{
    "$id": "https://spec.openapis.org/oas/3.1/meta/schema-object/2019-10",
    "$schema": "https://spec.openapis.org/oas/3.1/meta/schema-object/2019-10",
    "$vocabulary": {
        "https://json-schema.org/draft/2019-09/vocab/core": true,
        "https://json-schema.org/draft/2019-09/vocab/applicator": true,
        "https://json-schema.org/draft/2019-09/vocab/meta-data": true,
        "https://json-schema.org/draft/2019-09/vocab/format": false,
        "https://json-schema.org/draft/2019-09/vocab/content": true,
        "https://spec.openapis.org/oas/3.1/vocab/validation/2019-10": true,
        "https://spec.openapis.org/oas/3.1/vocab/extensions/2019-10": true
    },
    "$recursiveAnchor": true,

    "title": "Core and Validation specifications meta-schema",
    "allOf": [
        {"$ref": "https://json-schema.org/draft/2019-09/meta/core"},
        {"$ref": "https://json-schema.org/draft/2019-09/meta/applicator"},
        {"$ref": "https://json-schema.org/draft/2019-09/meta/meta-data"},
        {"$ref": "https://json-schema.org/draft/2019-09/meta/format"},
        {"$ref": "https://json-schema.org/draft/2019-09/meta/content"},
        {"$ref": "https://spec.openapis.org/oas/3.1/meta/validation/2019-10"},
        {"$ref": "https://spec.openapis.org/oas/3.1/meta/extensions/2019-10"}
    ],
    "type": ["object", "boolean"],
    "unevaluatedProperties": false
}`;
