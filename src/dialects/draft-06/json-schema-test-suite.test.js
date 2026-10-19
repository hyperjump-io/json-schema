import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { addDraft06, draft06DialectUri } from "./index.js";

/**
 * @import { JsonSchema } from "../../json-schema.d.ts"
 */

/** @type (validateFormats?: boolean) => JsonSchema */
const draft06JsonSchema = (validateFormats) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats });
  addDraft06(jsonSchema);
  return jsonSchema;
};

// In draft-06, `format` validates by default. Test cases tagged
// `format-annotation` are run with formats only annotated.
const jsonSchema = draft06JsonSchema();
const formatAnnotationJsonSchema = draft06JsonSchema(false);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite draft-06",
  version: 6,
  dialectUri: draft06DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-annotation") ? formatAnnotationJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id-legacy.json|$id with file URI still resolves pointers - *nix",
    "|id-legacy.json|$id with file URI still resolves pointers - windows"
  ])
});
