import { readFileSync } from "node:fs";
import { describeValidationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft202012Dialect } from "../draft-2020-12/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "./index.js";

/**
 * @import { JsonSchemaConfig } from "../../json-schema.d.ts"
 */

// The dialect is defined by OpenAPI's meta-schema, which is in every test
// case's registry
const metaSchema = JSON.parse(readFileSync(new URL("meta-schemas/dialect-2024-11-10.json", import.meta.url), "utf8"));

/** @type (validateFormats: boolean) => JsonSchemaConfig */
const openApi31JsonSchema = (validateFormats) => testSuiteJsonSchema({
  validateFormats,
  dialects: [draft202012Dialect],
  vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary }
});

// The dialect is 2020-12 with OpenAPI's annotations, so it passes 2020-12's
// test cases. `format` is an annotation by default. Test cases tagged
// `format-assertion` are run with formats validated.
const jsonSchema = openApi31JsonSchema(false);
const formatAssertionJsonSchema = openApi31JsonSchema(true);

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite 2020-12 with OpenAPI 3.1",
  version: 2020,
  dialectUri: "https://spec.openapis.org/oas/3.1/dialect/2024-11-10",
  metaSchemas: [metaSchema],
  jsonSchema: (testCase) => testCase.tags?.includes("format-assertion") ? formatAssertionJsonSchema : jsonSchema,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id.json|$id with file URI still resolves pointers - *nix",
    "|id.json|$id with file URI still resolves pointers - windows"
  ])
});
