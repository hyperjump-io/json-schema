import type { Draft04Keywords, Draft04Schema } from "./index.d.ts";
import type { Keyword } from "../../keyword.d.ts";
import type { Expression } from "../../kernel/kernel.d.ts";
import additionalItemsKeyword from "../../keywords/draft-2019-09/additionalItems.js";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import defaultKeyword from "../../keywords/default.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dependenciesKeyword from "../../keywords/draft-04/dependencies.js";
import descriptionKeyword from "../../keywords/description.js";
import enumKeyword from "../../keywords/draft-04/enum.js";
import exclusiveMaximumKeyword from "../../keywords/draft-04/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/draft-04/exclusiveMinimum.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import idKeyword from "../../keywords/draft-07/id.js";
import itemsKeyword from "../../keywords/draft-2019-09/items.js";
import maximumKeyword from "../../keywords/draft-04/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/draft-04/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import patternPropertiesKeyword from "../../keywords/draft-2020-12/patternProperties.js";
import propertiesKeyword from "../../keywords/properties.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/draft-04/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";

// The types of the keywords are the types of their definitions
({
  additionalItems: additionalItemsKeyword,
  additionalProperties: additionalPropertiesKeyword,
  allOf: allOfKeyword,
  anyOf: anyOfKeyword,
  default: defaultKeyword,
  definitions: definitionsKeyword,
  dependencies: dependenciesKeyword,
  description: descriptionKeyword,
  enum: enumKeyword,
  exclusiveMaximum: exclusiveMaximumKeyword,
  exclusiveMinimum: exclusiveMinimumKeyword,
  format: formatKeyword,
  id: idKeyword,
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
  $ref: refKeyword,
  required: requiredKeyword,
  title: titleKeyword,
  type: typeKeyword,
  uniqueItems: uniqueItemsKeyword
}) satisfies Draft04Keywords;

({
  $schema: "http://json-schema.org/draft-04/schema#",
  id: "https://example.com/schema",
  definitions: { positive: { type: "number", minimum: 0, exclusiveMinimum: true } },
  type: "object",
  properties: {
    tags: { type: "array", items: [{ type: "string" }, true], additionalItems: false },
    count: { $ref: "#/definitions/positive" }
  },
  required: ["tags"],
  dependencies: { tags: ["count"], count: { required: ["tags"] } },
  enum: [{ tags: [] }, null]
}) satisfies Draft04Schema;

// Unknown keywords are ignored
({ properties: { name: { minLenght: 1 } } }) satisfies Draft04Schema;

// @ts-expect-error A keyword's value is the wrong type, deep in the schema
({ properties: { name: { minLength: "1" } } }) satisfies Draft04Schema;

// @ts-expect-error `exclusiveMaximum` is a boolean in draft-04
({ maximum: 10, exclusiveMaximum: 10 }) satisfies Draft04Schema;

// @ts-expect-error Another dialect
({ $schema: "http://json-schema.org/draft-07/schema#" }) satisfies Draft04Schema;

// A custom keyword's subschemas are Draft04 schemas with the custom keyword
type MySchema = Draft04Schema<{ myKeyword: Keyword<Expression[], { array: "schema" }> }>;

({ myKeyword: [{ myKeyword: [true], minLength: 1 }] }) satisfies MySchema;

// @ts-expect-error
({ myKeyword: [{ minLength: "1" }] }) satisfies MySchema;
