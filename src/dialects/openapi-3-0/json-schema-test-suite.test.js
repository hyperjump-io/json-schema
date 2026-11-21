import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { openApi30Dialect, openApi30DialectUri } from "./index.js";

/**
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

/** @type (validateFormats: boolean) => JsonSchemaConfig */
const openApi30JsonSchema = (validateFormats) => {
  return testSuiteJsonSchema({ validateFormats, dialects: [openApi30Dialect] });
};

// OpenAPI 3.0 is a subset of draft-04, so it runs draft-04's test cases. They
// expect `format` to validate, so it does, except in test cases tagged
// `format-annotation`.
const jsonSchema = openApi30JsonSchema(true);
const formatAnnotationJsonSchema = openApi30JsonSchema(false);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite draft-04 with OpenAPI 3.0",
  version: 4,
  dialectUri: openApi30DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-annotation") ? formatAnnotationJsonSchema : jsonSchema,
  skip: new Set([
    // 3.0 has no `id`, so a schema is only identified by where it is
    "|anchor-legacy.json",
    "|id-legacy.json",
    // 3.0 has no `dependencies`, `patternProperties`, or `definitions`
    "|dependentRequired.json",
    "|dependentSchemas.json",
    "|patternProperties.json",
    "|additionalProperties.json|additionalProperties being false does not allow other properties",
    "|additionalProperties.json|non-ASCII pattern with additionalProperties",
    "|infinite-loop-detection-legacy.json|evaluating the same schema location against the same data location twice is not a sign of an infinite loop",
    "|properties.json|properties, patternProperties, additionalProperties interaction",
    "|ref-legacy.json|empty tokens in $ref json-pointer",
    "|ref-legacy.json|escaped pointer ref",
    "|ref-legacy.json|fragment within remote ref",
    "|ref-legacy.json|naive replacement of $ref with its destination is not correct",
    "|ref-legacy.json|nested refs",
    "|ref-legacy.json|property named $ref, containing an actual $ref",
    "|ref-legacy.json|ref overrides any sibling keywords",
    "|ref-legacy.json|refs with quote",
    "|ref-legacy.json|ref within remote ref",
    "|ref-legacy.json|relative pointer ref to array",
    "|ref-legacy.json|remote ref with ref to definitions",
    "|ref-legacy.json|root ref in remote ref",
    // 3.0's `items` is one schema, and it has no `additionalItems`
    "|items.json|additional items are allowed by default (2019)",
    "|items.json|additionalItems as false without items",
    "|items.json|additionalItems does not look in applicators, invalid case",
    "|items.json|additionalItems with heterogeneous array",
    "|items.json|an array of schemas for items",
    "|items.json|array of items with no additional items permitted",
    "|items.json|items and subitems (7)",
    "|items.json|items validation adjusts the starting index for additionalItems",
    "|items.json|when items is schema, additionalItems does nothing",
    "|items.json|when items is schema, boolean additionalItems does nothing",
    "|uniqueItems.json|uniqueItems=false with an array of items",
    "|uniqueItems.json|uniqueItems=false with an array of items and additionalItems=false",
    "|uniqueItems.json|uniqueItems with an array of items",
    "|uniqueItems.json|uniqueItems with an array of items and additionalItems=false",
    // 3.0's `type` is one type, and there's no `null` type. `nullable` allows
    // `null`.
    "|additionalProperties.json|additionalProperties with null valued instance properties",
    "|allOf.json|allOf with base schema",
    "|allOf.json|nested allOf, to check validation semantics",
    "|anyOf.json|nested anyOf, to check validation semantics",
    "|items.json|additionalItems with null instance elements",
    "|items.json|array-form items with null instance elements",
    "|items.json|items with null instance elements",
    "|not.json|not multiple types",
    "|oneOf.json|nested oneOf, to check validation semantics",
    "|properties.json|properties with null valued instance properties",
    "|type.json|multiple types can be specified in an array",
    "|type.json|null type matches only the null object",
    "|type.json|type: array, object or null",
    "|type.json|type: array or object",
    "|type.json|type as array with one item"
  ])
});
