module.exports = `{
    "$id": "https://spec.openapis.org/oas/3.1/meta/extensions/2019-10",
    "$schema": "https://json-schema.org/draft/2019-09/schema",
    "$vocabulary": {
      "https://spec.openapis.org/oas/3.1/vocab/extensions/2019-10": true
    },
    "$recursiveAnchor": true,

    "type": ["object", "boolean"],
    "properties": {
        "example": true,
        "nullable": {
            "type": "boolean",
            "default": false
        },
        "discriminator": {
            "$ref": "#/$defs/Discriminator"
        },
        "externalDocs": {
            "$ref": "#/$defs/ExternalDocs"
        },
        "xml": {
            "$ref": "#/$defs/Xml"
        }
    },
    "patternProperties": {
        "^x-": true
    },
    "$defs": {
        "Discriminator": {
            "type": "object",
            "required": ["propertyName"],
            "properties": {
                "propertyName": {
                    "type": "string"
                },
                "mapping": {
                    "additionalProperties": {
                        "type": "string"
                    }
                }
            },
            "additionalProperties": false
        },
        "ExternalDocs": {
            "type": "object",
            "required": ["url"],
            "properties": {
                "url": {
                    "type": "string",
                    "format": "uri-reference"
                },
                "description": {
                    "type": "string"
                }
            },
            "patternProperties": {
                "^x-": true
            },
            "additionalProperties": false
        },
        "Xml": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string"
                },
                "namespace": {
                    "type": "string",
                    "format": "uri"
                },
                "prefix": {
                    "type": "string"
                },
                "attribute": {
                    "type": "boolean"
                },
                "wrapped": {
                    "type": "boolean"
                }
            },
            "patternProperties": {
                "^x-": true
            },
            "additionalProperties": false
        }
    }
}`;
