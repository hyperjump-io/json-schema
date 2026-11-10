import type { Draft06Keywords, Draft06Schema } from "./index.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression } from "../../kernel/kernel.d.ts";
import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import constKeyword from "../../keywords/const.js";
import containsKeyword from "../../keywords/contains.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-07/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import enumKeyword from "../../keywords/enum.js";
import examplesKeyword from "../../keywords/examples.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import idKeyword from "../../keywords/draft-07/id.js";
import itemsKeyword from "../../keywords/draft-2019-09/items.js";
import maximumKeyword from "../../keywords/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import patternPropertiesKeyword from "../../keywords/draft-2020-12/patternProperties.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";

// The types of the keywords are the types of their definitions
({
  additionalItems: additionalItemsKeyword,
  additionalProperties: additionalPropertiesKeyword,
  allOf: allOfKeyword,
  anyOf: anyOfKeyword,
  const: constKeyword,
  contains: containsKeyword,
  default: defaultKeyword,
  definitions: definitionsKeyword,
  dependencies: dependenciesKeyword,
  description: descriptionKeyword,
  enum: enumKeyword,
  examples: examplesKeyword,
  exclusiveMaximum: exclusiveMaximumKeyword,
  exclusiveMinimum: exclusiveMinimumKeyword,
  format: formatKeyword,
  $id: idKeyword,
  items: itemsKeyword,
  maximum: maximumKeyword,
  maxItems: maxItemsKeyword,
  maxLength: maxLengthKeyword,
  maxProperties: maxPropertiesKeyword,
  minimum: minimumKeyword,
  minItems: minItemsKeyword,
  minLength: minLengthKeyword,
  minProperties: minPropertiesKeyword,
  multipleOf: multipleOfKeyword,
  not: notKeyword,
  oneOf: oneOfKeyword,
  pattern: patternKeyword,
  patternProperties: patternPropertiesKeyword,
  properties: propertiesKeyword,
  propertyNames: propertyNamesKeyword,
  $ref: refKeyword,
  required: requiredKeyword,
  title: titleKeyword,
  type: typeKeyword,
  uniqueItems: uniqueItemsKeyword
}) satisfies Draft06Keywords;

({
  $schema: "http://json-schema.org/draft-06/schema#",
  $id: "https://example.com/schema",
  definitions: { positive: { type: "number", exclusiveMinimum: 0 } },
  type: "object",
  properties: {
    tags: { type: "array", items: [{ type: "string" }], contains: { const: "a" } },
    count: { $ref: "#/definitions/positive" }
  },
  propertyNames: { pattern: "^[a-z]+$" },
  examples: [{ tags: [] }]
}) satisfies Draft06Schema;

// Unknown keywords are ignored
({ properties: { name: { minLenght: 1 } } }) satisfies Draft06Schema;

// @ts-expect-error A keyword's value is the wrong type, deep in the schema
({ properties: { name: { minLength: "1" } } }) satisfies Draft06Schema;

// @ts-expect-error `exclusiveMaximum` is a number since draft-06
({ exclusiveMaximum: true }) satisfies Draft06Schema;

// @ts-expect-error Another dialect
({ $schema: "http://json-schema.org/draft-04/schema#" }) satisfies Draft06Schema;

// A custom keyword's subschemas are Draft06 schemas with the custom keyword
type MySchema = Draft06Schema<{ myKeyword: Keyword<Expression[], { array: "schema" }> }>;

({ myKeyword: [{ myKeyword: [true], minLength: 1 }] }) satisfies MySchema;

// @ts-expect-error
({ myKeyword: [{ minLength: "1" }] }) satisfies MySchema;
