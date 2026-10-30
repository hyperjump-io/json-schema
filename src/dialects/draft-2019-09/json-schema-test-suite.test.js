import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft201909Dialect, draft201909DialectUri } from "./index.js";

/**
 * @import { JsonSchema } from "../../json-schema.d.ts"
 */

/** @type (validateFormats: boolean) => JsonSchema */
const draft201909JsonSchema = (validateFormats) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats, dialects: [draft201909Dialect] });
  return jsonSchema;
};

// In 2019-09, `format` is an annotation by default. Test cases tagged
// `format-assertion` are run with formats validated.
const jsonSchema = draft201909JsonSchema(false);
const formatAssertionJsonSchema = draft201909JsonSchema(true);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite 2019-09",
  version: 2019,
  dialectUri: draft201909DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-assertion") ? formatAssertionJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id.json|$id with file URI still resolves pointers - *nix",
    "|id.json|$id with file URI still resolves pointers - windows"
  ])
});
