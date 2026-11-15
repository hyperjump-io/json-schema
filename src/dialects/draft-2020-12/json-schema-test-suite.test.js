import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft202012Dialect, draft202012DialectUri } from "./index.js";

/**
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

/** @type (validateFormats: boolean) => JsonSchemaConfig */
const draft202012JsonSchema = (validateFormats) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats, dialects: [draft202012Dialect] });
  return jsonSchema;
};

// In 2020-12, `format` is an annotation by default. Test cases tagged
// `format-assertion` are run with formats validated.
const jsonSchema = draft202012JsonSchema(false);
const formatAssertionJsonSchema = draft202012JsonSchema(true);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite 2020-12",
  version: 2020,
  dialectUri: draft202012DialectUri,
  jsonSchema: (testCase) => testCase.tags?.includes("format-assertion") ? formatAssertionJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id.json|$id with file URI still resolves pointers - *nix",
    "|id.json|$id with file URI still resolves pointers - windows"
  ])
});
