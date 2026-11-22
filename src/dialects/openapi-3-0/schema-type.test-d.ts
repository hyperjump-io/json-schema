import type { OpenApi30Keywords, OpenApi30Schema } from "./index.d.ts";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import discriminatorKeyword from "../../keywords/oas/3.1/discriminator.js";
import enumKeyword from "../../keywords/enum.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import exclusiveMaximumKeyword from "../../keywords/oas/3.0/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/oas/3.0/exclusiveMinimum.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import formatKeyword from "../../keywords/draft-07/format.js";
import itemsKeyword from "../../keywords/items.js";
import maximumKeyword from "../../keywords/oas/3.0/maximum.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import minimumKeyword from "../../keywords/oas/3.0/minimum.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import notKeyword from "../../keywords/not.js";
import nullableKeyword from "../../keywords/oas/3.0/nullable.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import propertiesKeyword from "../../keywords/properties.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import refKeyword from "../../keywords/draft-07/ref.js";
import requiredKeyword from "../../keywords/draft-04/required.js";
import titleKeyword from "../../keywords/title.js";
import typeKeyword from "../../keywords/oas/3.0/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import xmlKeyword from "../../keywords/oas/3.1/xml.js";

// The types of the keywords are the types of their definitions
({
  additionalProperties: additionalPropertiesKeyword,
  allOf: allOfKeyword,
  anyOf: anyOfKeyword,
  default: defaultKeyword,
  deprecated: deprecatedKeyword,
  description: descriptionKeyword,
  discriminator: discriminatorKeyword,
  enum: enumKeyword,
  example: exampleKeyword,
  exclusiveMaximum: exclusiveMaximumKeyword,
  exclusiveMinimum: exclusiveMinimumKeyword,
  externalDocs: externalDocsKeyword,
  format: formatKeyword,
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
  nullable: nullableKeyword,
  oneOf: oneOfKeyword,
  pattern: patternKeyword,
  properties: propertiesKeyword,
  readOnly: readOnlyKeyword,
  $ref: refKeyword,
  required: requiredKeyword,
  title: titleKeyword,
  type: typeKeyword,
  uniqueItems: uniqueItemsKeyword,
  writeOnly: writeOnlyKeyword,
  xml: xmlKeyword
}) satisfies OpenApi30Keywords;

({
  type: "object",
  properties: {
    name: { type: "string", nullable: true, example: "Fido" },
    tags: { type: "array", items: { type: "string" } },
    owner: { $ref: "#/components/schemas/Owner" }
  },
  required: ["name"],
  discriminator: { propertyName: "kind", mapping: { dog: "#/components/schemas/Dog" } },
  externalDocs: { url: "https://example.com/docs" },
  xml: { name: "pet", wrapped: true }
}) satisfies OpenApi30Schema;

// Keywords starting with `x-` are allowed
({ "x-internal": true }) satisfies OpenApi30Schema;

// @ts-expect-error Unknown keywords are errors
({ patternProperties: {} }) satisfies OpenApi30Schema;

// @ts-expect-error `type` is one type
({ type: ["string", "null"] }) satisfies OpenApi30Schema;

// @ts-expect-error There's no `null` type
({ type: "null" }) satisfies OpenApi30Schema;

// @ts-expect-error `discriminator` needs a `propertyName`
({ discriminator: {} }) satisfies OpenApi30Schema;
