import { addKeyword, defineVocabulary, loadDialect } from "./keywords.js";
import { addSchema } from "./core.js";
import { addMediaTypePlugin } from "./media-types.js";

import metaSchema from "../meta/validation.js";
import coreMetaSchema from "../meta/meta/core.js";
import applicatorMetaSchema from "../meta/meta/applicator.js";
import validationMetaSchema from "../meta/meta/validation.js";
import metaDataMetaSchema from "../meta/meta/meta-data.js";
import formatAnnotationMetaSchema from "../meta/meta/format-annotation.js";
import formatAssertionMetaSchema from "../meta/meta/format-assertion.js";
import contentMetaSchema from "../meta/meta/content.js";
import unevaluatedMetaSchema from "../meta/meta/unevaluated.js";

import additionalProperties from "./keywords/additionalProperties.js";
import allOf from "./keywords/allOf.js";
import anchor from "./keywords/anchor.js";
import anyOf from "./keywords/anyOf.js";
import const_ from "./keywords/const.js";
import contains from "./keywords/contains.js";
import comment from "./keywords/comment.js";
import contentEncoding from "./keywords/contentEncoding.js";
import contentMediaType from "./keywords/contentMediaType.js";
import contentSchema from "./keywords/contentSchema.js";
import default_ from "./keywords/default.js";
import definitions from "./keywords/definitions.js";
import dependentRequired from "./keywords/dependentRequired.js";
import dependentSchemas from "./keywords/dependentSchemas.js";
import deprecated from "./keywords/deprecated.js";
import description from "./keywords/description.js";
import dynamicAnchor from "./keywords/dynamicAnchor.js";
import dynamicRef from "./keywords/dynamicRef.js";
import else_ from "./keywords/else.js";
import enum_ from "./keywords/enum.js";
import examples from "./keywords/examples.js";
import exclusiveMaximum from "./keywords/exclusiveMaximum.js";
import exclusiveMinimum from "./keywords/exclusiveMinimum.js";
import format from "./keywords/format.js";
import id from "./keywords/id.js";
import if_ from "./keywords/if.js";
import items from "./keywords/items.js";
import maxContains from "./keywords/maxContains.js";
import maxItems from "./keywords/maxItems.js";
import maxLength from "./keywords/maxLength.js";
import maxProperties from "./keywords/maxProperties.js";
import maximum from "./keywords/maximum.js";
import minContains from "./keywords/minContains.js";
import minItems from "./keywords/minItems.js";
import minLength from "./keywords/minLength.js";
import minProperties from "./keywords/minProperties.js";
import minimum from "./keywords/minimum.js";
import multipleOf from "./keywords/multipleOf.js";
import not from "./keywords/not.js";
import oneOf from "./keywords/oneOf.js";
import pattern from "./keywords/pattern.js";
import patternProperties from "./keywords/patternProperties.js";
import prefixItems from "./keywords/prefixItems.js";
import properties from "./keywords/properties.js";
import propertyDependencies from "./keywords/propertyDependencies.js";
import propertyNames from "./keywords/propertyNames.js";
import readOnly from "./keywords/readOnly.js";
import ref from "./keywords/ref.js";
import requireAllExcept from "./keywords/requireAllExcept.js";
import required from "./keywords/required.js";
import title from "./keywords/title.js";
import then from "./keywords/then.js";
import type from "./keywords/type.js";
import unevaluatedItems from "./keywords/unevaluatedItems.js";
import unevaluatedProperties from "./keywords/unevaluatedProperties.js";
import uniqueItems from "./keywords/uniqueItems.js";
import vocabulary from "./keywords/vocabulary.js";
import writeOnly from "./keywords/writeOnly.js";


addMediaTypePlugin("application/schema+json", {
  parse: async (response, contentTypeParameters) => [
    await response.json(),
    contentTypeParameters.schema || contentTypeParameters.profile
  ],
  matcher: (path) => path.endsWith(".schema.json")
});

addKeyword(additionalProperties);
addKeyword(allOf);
addKeyword(anchor);
addKeyword(anyOf);
addKeyword(const_);
addKeyword(contains);
addKeyword(comment);
addKeyword(contentEncoding);
addKeyword(contentMediaType);
addKeyword(contentSchema);
addKeyword(default_);
addKeyword(definitions);
addKeyword(dependentRequired);
addKeyword(dependentSchemas);
addKeyword(deprecated);
addKeyword(description);
addKeyword(dynamicAnchor);
addKeyword(dynamicRef);
addKeyword(else_);
addKeyword(enum_);
addKeyword(examples);
addKeyword(exclusiveMaximum);
addKeyword(exclusiveMinimum);
addKeyword(format);
addKeyword(id);
addKeyword(if_);
addKeyword(items);
addKeyword(maxContains);
addKeyword(maxItems);
addKeyword(maxLength);
addKeyword(maxProperties);
addKeyword(maximum);
addKeyword(minContains);
addKeyword(minItems);
addKeyword(minLength);
addKeyword(minProperties);
addKeyword(minimum);
addKeyword(multipleOf);
addKeyword(not);
addKeyword(oneOf);
addKeyword(pattern);
addKeyword(patternProperties);
addKeyword(prefixItems);
addKeyword(properties);
addKeyword(propertyDependencies);
addKeyword(propertyNames);
addKeyword(readOnly);
addKeyword(ref);
addKeyword(requireAllExcept);
addKeyword(required);
addKeyword(title);
addKeyword(then);
addKeyword(type);
addKeyword(unevaluatedItems);
addKeyword(unevaluatedProperties);
addKeyword(uniqueItems);
addKeyword(vocabulary);
addKeyword(writeOnly);


defineVocabulary("https://json-schema.org/vocab/core", {
  "$anchor": "https://json-schema.org/keyword/anchor",
  "$comment": "https://json-schema.org/keyword/comment",
  "$defs": "https://json-schema.org/keyword/definitions",
  "$dynamicAnchor": "https://json-schema.org/keyword/dynamicAnchor",
  "$dynamicRef": "https://json-schema.org/keyword/dynamicRef",
  "$id": "https://json-schema.org/keyword/id",
  "$ref": "https://json-schema.org/keyword/ref",
  "$vocabulary": "https://json-schema.org/keyword/vocabulary"
});

defineVocabulary("https://json-schema.org/vocab/applicator", {
  "additionalProperties": "https://json-schema.org/keyword/additionalProperties",
  "allOf": "https://json-schema.org/keyword/allOf",
  "anyOf": "https://json-schema.org/keyword/anyOf",
  "contains": "https://json-schema.org/keyword/contains",
  "minContains": "https://json-schema.org/keyword/minContains",
  "maxContains": "https://json-schema.org/keyword/maxContains",
  "dependentSchemas": "https://json-schema.org/keyword/dependentSchemas",
  "if": "https://json-schema.org/keyword/if",
  "then": "https://json-schema.org/keyword/then",
  "else": "https://json-schema.org/keyword/else",
  "items": "https://json-schema.org/keyword/items",
  "not": "https://json-schema.org/keyword/not",
  "oneOf": "https://json-schema.org/keyword/oneOf",
  "patternProperties": "https://json-schema.org/keyword/patternProperties",
  "prefixItems": "https://json-schema.org/keyword/prefixItems",
  "properties": "https://json-schema.org/keyword/properties",
  "propertyDependencies": "https://json-schema.org/keyword/propertyDependencies",
  "propertyNames": "https://json-schema.org/keyword/propertyNames"
});

defineVocabulary("https://json-schema.org/vocab/validation", {
  "const": "https://json-schema.org/keyword/const",
  "dependentRequired": "https://json-schema.org/keyword/dependentRequired",
  "enum": "https://json-schema.org/keyword/enum",
  "exclusiveMaximum": "https://json-schema.org/keyword/exclusiveMaximum",
  "exclusiveMinimum": "https://json-schema.org/keyword/exclusiveMinimum",
  "maxItems": "https://json-schema.org/keyword/maxItems",
  "maxLength": "https://json-schema.org/keyword/maxLength",
  "maxProperties": "https://json-schema.org/keyword/maxProperties",
  "maximum": "https://json-schema.org/keyword/maximum",
  "minItems": "https://json-schema.org/keyword/minItems",
  "minLength": "https://json-schema.org/keyword/minLength",
  "minProperties": "https://json-schema.org/keyword/minProperties",
  "minimum": "https://json-schema.org/keyword/minimum",
  "multipleOf": "https://json-schema.org/keyword/multipleOf",
  "requireAllExcept": "https://json-schema.org/keyword/requireAllExcept",
  "pattern": "https://json-schema.org/keyword/pattern",
  "required": "https://json-schema.org/keyword/required",
  "type": "https://json-schema.org/keyword/type",
  "uniqueItems": "https://json-schema.org/keyword/uniqueItems"
});

defineVocabulary("https://json-schema.org/vocab/meta-data", {
  "default": "https://json-schema.org/keyword/default",
  "deprecated": "https://json-schema.org/keyword/deprecated",
  "description": "https://json-schema.org/keyword/description",
  "examples": "https://json-schema.org/keyword/examples",
  "readOnly": "https://json-schema.org/keyword/readOnly",
  "title": "https://json-schema.org/keyword/title",
  "writeOnly": "https://json-schema.org/keyword/writeOnly"
});

defineVocabulary("https://json-schema.org/vocab/format-annotation", {
  "format": "https://json-schema.org/keyword/format"
});

defineVocabulary("https://json-schema.org/vocab/format-assertion", {
  "format": "https://json-schema.org/keyword/format-assertion"
});

defineVocabulary("https://json-schema.org/vocab/content", {
  "contentEncoding": "https://json-schema.org/keyword/contentEncoding",
  "contentMediaType": "https://json-schema.org/keyword/contentMediaType",
  "contentSchema": "https://json-schema.org/keyword/contentSchema"
});

defineVocabulary("https://json-schema.org/vocab/unevaluated", {
  "unevaluatedItems": "https://json-schema.org/keyword/unevaluatedItems",
  "unevaluatedProperties": "https://json-schema.org/keyword/unevaluatedProperties"
});

loadDialect("https://json-schema.org/validation", {
  "https://json-schema.org/vocab/core": true,
  "https://json-schema.org/vocab/applicator": true,
  "https://json-schema.org/vocab/validation": true,
  "https://json-schema.org/vocab/meta-data": true,
  "https://json-schema.org/vocab/format-annotation": true,
  "https://json-schema.org/vocab/content": true,
  "https://json-schema.org/vocab/unevaluated": true
});

addSchema(JSON.parse(metaSchema));
addSchema(JSON.parse(coreMetaSchema));
addSchema(JSON.parse(applicatorMetaSchema));
addSchema(JSON.parse(validationMetaSchema));
addSchema(JSON.parse(metaDataMetaSchema));
addSchema(JSON.parse(formatAnnotationMetaSchema));
addSchema(JSON.parse(formatAssertionMetaSchema));
addSchema(JSON.parse(contentMetaSchema));
addSchema(JSON.parse(unevaluatedMetaSchema));

export * from "./core.js";
export * from "./configuration.js";
export * from "./keywords.js";
export * from "./pubsub.js";
export * as Instance from "./instance.js";
export * as Schema from "./schema.js";
export { InvalidSchemaError } from "./invalid-schema-error.js";
export { default as Validate } from "./keywords/validate.js";
export { addMediaTypePlugin } from "./media-types.js";
