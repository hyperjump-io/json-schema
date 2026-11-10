import type { Draft202012Keywords, Draft202012Schema } from "./index.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression } from "../../kernel/kernel.d.ts";
import anchorKeyword from "../../keywords/anchor.js";
import commentKeyword from "../../keywords/comment.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dynamicAnchorKeyword from "../../keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../keywords/draft-2020-12/dynamicRef.js";
import idKeyword from "../../keywords/id.js";
import refKeyword from "../../keywords/ref.js";
import vocabularyKeyword from "../../keywords/vocabulary.js";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import containsKeyword from "../../keywords/contains.js";
import dependentSchemasKeyword from "../../keywords/dependentSchemas.js";
import ifKeyword from "../../keywords/if.js";
import thenKeyword from "../../keywords/then.js";
import elseKeyword from "../../keywords/else.js";
import itemsKeyword from "../../keywords/items.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternPropertiesKeyword from "../../keywords/draft-2020-12/patternProperties.js";
import prefixItemsKeyword from "../../keywords/prefixItems.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import unevaluatedItemsKeyword from "../../keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "../../keywords/unevaluatedProperties.js";
import constKeyword from "../../keywords/const.js";
import dependentRequiredKeyword from "../../keywords/dependentRequired.js";
import enumKeyword from "../../keywords/enum.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import maxContainsKeyword from "../../keywords/maxContains.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import maximumKeyword from "../../keywords/maximum.js";
import minContainsKeyword from "../../keywords/minContains.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import requiredKeyword from "../../keywords/required.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import examplesKeyword from "../../keywords/examples.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import titleKeyword from "../../keywords/title.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import contentEncodingKeyword from "../../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../../keywords/contentMediaType.js";
import contentSchemaKeyword from "../../keywords/contentSchema.js";
import formatKeyword from "../../keywords/format.js";

// The types of the keywords are the types of their definitions
({
  $anchor: anchorKeyword,
  $comment: commentKeyword,
  $defs: definitionsKeyword,
  $dynamicAnchor: dynamicAnchorKeyword,
  $dynamicRef: dynamicRefKeyword,
  $id: idKeyword,
  $ref: refKeyword,
  $vocabulary: vocabularyKeyword,
  additionalProperties: additionalPropertiesKeyword,
  allOf: allOfKeyword,
  anyOf: anyOfKeyword,
  contains: containsKeyword,
  dependentSchemas: dependentSchemasKeyword,
  if: ifKeyword,
  then: thenKeyword,
  else: elseKeyword,
  items: itemsKeyword,
  not: notKeyword,
  oneOf: oneOfKeyword,
  patternProperties: patternPropertiesKeyword,
  prefixItems: prefixItemsKeyword,
  properties: propertiesKeyword,
  propertyNames: propertyNamesKeyword,
  unevaluatedItems: unevaluatedItemsKeyword,
  unevaluatedProperties: unevaluatedPropertiesKeyword,
  const: constKeyword,
  dependentRequired: dependentRequiredKeyword,
  enum: enumKeyword,
  exclusiveMaximum: exclusiveMaximumKeyword,
  exclusiveMinimum: exclusiveMinimumKeyword,
  maxContains: maxContainsKeyword,
  maxItems: maxItemsKeyword,
  maxLength: maxLengthKeyword,
  maxProperties: maxPropertiesKeyword,
  maximum: maximumKeyword,
  minContains: minContainsKeyword,
  minItems: minItemsKeyword,
  minLength: minLengthKeyword,
  minProperties: minPropertiesKeyword,
  minimum: minimumKeyword,
  multipleOf: multipleOfKeyword,
  pattern: patternKeyword,
  required: requiredKeyword,
  type: typeKeyword,
  uniqueItems: uniqueItemsKeyword,
  default: defaultKeyword,
  deprecated: deprecatedKeyword,
  description: descriptionKeyword,
  examples: examplesKeyword,
  readOnly: readOnlyKeyword,
  title: titleKeyword,
  writeOnly: writeOnlyKeyword,
  contentEncoding: contentEncodingKeyword,
  contentMediaType: contentMediaTypeKeyword,
  contentSchema: contentSchemaKeyword,
  format: formatKeyword
}) satisfies Draft202012Keywords;

({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/schema",
  $dynamicAnchor: "node",
  $defs: { positive: { type: "number", exclusiveMinimum: 0 } },
  type: "object",
  properties: {
    pair: { type: "array", prefixItems: [{ type: "string" }, true], items: false },
    count: { $ref: "#/$defs/positive" },
    children: { type: "array", items: { $dynamicRef: "#node" } }
  },
  dependentSchemas: { pair: { required: ["count"] } },
  unevaluatedProperties: false
}) satisfies Draft202012Schema;

// Unknown keywords are annotations
({ properties: { name: { minLenght: 1 } } }) satisfies Draft202012Schema;

// @ts-expect-error A keyword's value is the wrong type, deep in the schema
({ properties: { name: { minLength: "1" } } }) satisfies Draft202012Schema;

// @ts-expect-error `items` is one schema in 2020-12
({ items: [true] }) satisfies Draft202012Schema;

// @ts-expect-error Another dialect
({ $schema: "https://json-schema.org/draft/2019-09/schema" }) satisfies Draft202012Schema;

// A custom keyword's subschemas are Draft202012 schemas with the custom keyword
type MySchema = Draft202012Schema<{ myKeyword: Keyword<Expression[], { array: "schema" }> }>;

({ myKeyword: [{ myKeyword: [true], minLength: 1 }] }) satisfies MySchema;

// @ts-expect-error
({ myKeyword: [{ minLength: "1" }] }) satisfies MySchema;
