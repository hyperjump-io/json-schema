import type { V1Keywords, V1Schema } from "./index.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression } from "../../kernel/kernel.d.ts";
import anchorKeyword from "../../keywords/anchor.js";
import commentKeyword from "../../keywords/comment.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dynamicAnchorKeyword from "../../keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../keywords/dynamicRef.js";
import idKeyword from "../../keywords/id.js";
import refKeyword from "../../keywords/ref.js";
import additionalPropertiesKeyword from "../../keywords/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import containsKeyword from "../../keywords/contains.js";
import minContainsKeyword from "../../keywords/minContains.js";
import maxContainsKeyword from "../../keywords/maxContains.js";
import dependentSchemasKeyword from "../../keywords/dependentSchemas.js";
import ifKeyword from "../../keywords/if.js";
import thenKeyword from "../../keywords/then.js";
import elseKeyword from "../../keywords/else.js";
import itemsKeyword from "../../keywords/items.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternPropertiesKeyword from "../../keywords/patternProperties.js";
import prefixItemsKeyword from "../../keywords/prefixItems.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyDependenciesKeyword from "../../keywords/propertyDependencies.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import constKeyword from "../../keywords/const.js";
import dependentRequiredKeyword from "../../keywords/dependentRequired.js";
import enumKeyword from "../../keywords/enum.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import maximumKeyword from "../../keywords/maximum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import patternKeyword from "../../keywords/pattern.js";
import requiredKeyword from "../../keywords/required.js";
import typeKeyword from "../../keywords/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import examplesKeyword from "../../keywords/examples.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import titleKeyword from "../../keywords/title.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import formatKeyword from "../../keywords/format.js";
import contentEncodingKeyword from "../../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../../keywords/contentMediaType.js";
import contentSchemaKeyword from "../../keywords/contentSchema.js";
import unevaluatedItemsKeyword from "../../keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "../../keywords/unevaluatedProperties.js";
import conditionalKeyword from "../../keywords/conditional.js";
import itemPatternKeyword from "../../keywords/itemPattern.js";
import requireAllExceptKeyword from "../../keywords/requireAllExcept.js";

// The types of the keywords are the types of their definitions
({
  $anchor: anchorKeyword,
  $comment: commentKeyword,
  $defs: definitionsKeyword,
  $dynamicAnchor: dynamicAnchorKeyword,
  $dynamicRef: dynamicRefKeyword,
  $id: idKeyword,
  $ref: refKeyword,
  additionalProperties: additionalPropertiesKeyword,
  allOf: allOfKeyword,
  anyOf: anyOfKeyword,
  contains: containsKeyword,
  minContains: minContainsKeyword,
  maxContains: maxContainsKeyword,
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
  propertyDependencies: propertyDependenciesKeyword,
  propertyNames: propertyNamesKeyword,
  const: constKeyword,
  dependentRequired: dependentRequiredKeyword,
  enum: enumKeyword,
  exclusiveMaximum: exclusiveMaximumKeyword,
  exclusiveMinimum: exclusiveMinimumKeyword,
  maxItems: maxItemsKeyword,
  maxLength: maxLengthKeyword,
  maxProperties: maxPropertiesKeyword,
  maximum: maximumKeyword,
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
  format: formatKeyword,
  contentEncoding: contentEncodingKeyword,
  contentMediaType: contentMediaTypeKeyword,
  contentSchema: contentSchemaKeyword,
  unevaluatedItems: unevaluatedItemsKeyword,
  unevaluatedProperties: unevaluatedPropertiesKeyword,
  conditional: conditionalKeyword,
  itemPattern: itemPatternKeyword,
  requireAllExcept: requireAllExceptKeyword
}) satisfies V1Keywords;

({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/schema",
  $defs: { positive: { type: "number", exclusiveMinimum: 0 } },
  type: "object",
  properties: {
    name: { type: ["string", "null"], minLength: 1 },
    tags: { type: "array", items: { type: "string" }, uniqueItems: true },
    count: { $ref: "#/$defs/positive" }
  },
  required: ["name"],
  dependentRequired: { tags: ["count"] },
  propertyDependencies: { kind: { a: { required: ["tags"] } } },
  conditional: [{ required: ["a"] }, [true, { required: ["b"] }]],
  itemPattern: [{ type: "string" }, "*", [true, "|", false], "+"],
  enum: [{ name: "a" }, null]
}) satisfies V1Schema;

// Keywords starting with `x-` can have any value
({ "x-note": { anything: [1, 2] }, "properties": { name: { "x-display": "Name" } } }) satisfies V1Schema;

true satisfies V1Schema;

// `$schema` can have an empty fragment
({ $schema: "https://json-schema.org/v1#" }) satisfies V1Schema;

// A schema can be readonly
const readonlySchema = {
  properties: { name: { type: "string" } },
  required: ["name"],
  enum: [["a"]]
} as const;
readonlySchema satisfies V1Schema;

// @ts-expect-error An unknown keyword, deep in the schema
({ properties: { name: { minLenght: 1 } } }) satisfies V1Schema;

// @ts-expect-error A keyword's value is the wrong type
({ items: { minLength: "1" } }) satisfies V1Schema;

// @ts-expect-error A schema where data is expected
({ required: [{ type: "string" }] }) satisfies V1Schema;

// @ts-expect-error Data where a schema is expected
({ not: "string" }) satisfies V1Schema;

// @ts-expect-error A type that isn't a type
({ type: "float" }) satisfies V1Schema;

// @ts-expect-error An item pattern operator that isn't one
({ itemPattern: [true, "!"] }) satisfies V1Schema;

// @ts-expect-error Another dialect
({ $schema: "https://json-schema.org/draft/2020-12/schema" }) satisfies V1Schema;

// A custom keyword's subschemas are v1 schemas with the custom keyword
type MyKeyword = Keyword<[string, Expression | number[]][], { map: ["schema", { array: "data" }] }>;
type MySchema = V1Schema<{ myKeyword: MyKeyword }>;

({ myKeyword: { a: { myKeyword: { b: [1, 2] } }, c: false } }) satisfies MySchema;

// @ts-expect-error A custom keyword's data
({ myKeyword: { a: ["1"] } }) satisfies MySchema;

// @ts-expect-error A custom keyword's schemas
({ myKeyword: { a: { minLength: "1" } } }) satisfies MySchema;

// @ts-expect-error Without the extension
({ myKeyword: {} }) satisfies V1Schema;

// A keyword declared with `satisfies` keeps its shape
const evenKeyword = {
  uri: "https://example.com/keyword/even",
  shape: "data",
  lower: (even: boolean) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
} satisfies Keyword<boolean>;

({ items: { even: true } }) satisfies V1Schema<{ even: typeof evenKeyword }>;

// @ts-expect-error
({ items: { even: 1 } }) satisfies V1Schema<{ even: typeof evenKeyword }>;
