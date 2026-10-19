import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describeValidationTestSuite, testSuiteJsonSchema, validationTestsPath } from "../../../test/test-suite.js";
import { v1DialectUri } from "./index.js";

const proposalsPath = join(validationTestsPath, "proposals");

/**
 * Directories of test files, by the name their files are reported under.
 * `extension-tests` has tests in the suite's format for keywords the suite
 * doesn't cover.
 *
 * @type Record<string, string>
 */
const testDirectories = { "": validationTestsPath };
for (const entry of readdirSync(proposalsPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    testDirectories[`proposals/${entry.name}/`] = join(proposalsPath, entry.name);
  }
}
testDirectories["extension-tests/"] = join(import.meta.dirname, "extension-tests");

/** In v1, `format` asserts by default */
const supportedTags = new Set(["format-assertion"]);

const jsonSchema = testSuiteJsonSchema();

describeValidationTestSuite({
  description: "JSON-Schema-Test-Suite v1",
  // v1 is in the spec but not released, so the suite calls it 9999
  version: 9999,
  dialectUri: v1DialectUri,
  jsonSchema: () => jsonSchema,
  applies: (testCase) => (testCase.tags ?? []).every((tag) => supportedTags.has(tag)),
  testDirectories: testDirectories,
  skip: new Set([
    // A schema that wasn't retrieved from a file can't identify as one, for
    // security reasons
    "|id.json|$id with file URI still resolves pointers - *nix",
    "|id.json|$id with file URI still resolves pointers - windows"
  ])
});
