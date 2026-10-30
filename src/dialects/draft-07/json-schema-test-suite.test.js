import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft07Dialect, draft07DialectUri } from "./index.js";

/**
 * @import { JsonSchema } from "../../json-schema.d.ts"
 */

/** @type (validateFormats?: boolean) => JsonSchema */
const draft07JsonSchema = (validateFormats) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats, dialects: [draft07Dialect] });
  return jsonSchema;
};

// In draft-07, `format` validates by default. Test cases tagged
// `format-annotation` are run with formats only annotated.
const jsonSchema = draft07JsonSchema();
const formatAnnotationJsonSchema = draft07JsonSchema(false);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite draft-07",
  version: 7,
  dialectUri: draft07DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-annotation") ? formatAnnotationJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id-legacy.json|$id with file URI still resolves pointers - *nix",
    "|id-legacy.json|$id with file URI still resolves pointers - windows"
  ])
});
