import { describeValidationTestSuite, testSuiteJsonSchema } from "../test-suite.js";
import { addDraft04, draft04DialectUri } from "./index.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/** @type (validateFormats?: boolean) => JsonSchema */
const draft04JsonSchema = (validateFormats) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats });
  addDraft04(jsonSchema);
  return jsonSchema;
};

// In draft-04, `format` validates by default. Test cases tagged
// `format-annotation` are run with formats only annotated.
const jsonSchema = draft04JsonSchema();
const formatAnnotationJsonSchema = draft04JsonSchema(false);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite draft-04",
  version: 4,
  dialectUri: draft04DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-annotation") ? formatAnnotationJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id-legacy.json|id with file URI still resolves pointers - *nix",
    "|id-legacy.json|id with file URI still resolves pointers - windows"
  ])
});
