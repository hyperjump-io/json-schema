import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { compileTestCase, isCompatible, isSkipped, testSuiteJsonSchema } from "../test-suite.js";
import { addDraft202012, draft202012DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchema, Validator } from "../json-schema.d.ts"
 */

/**
 * @typedef {{
 *   description: string;
 *   tests: TestCase[];
 * }} TestFile
 *
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   tags?: string[];
 *   schema: Json;
 *   externalSchemas?: Record<string, Json>;
 *   tests: Test[];
 * }} TestCase
 *
 * @typedef {{
 *   description: string;
 *   data: Json;
 *   valid: boolean;
 * }} Test
 */

const testsPath = join(import.meta.dirname, "../../node_modules/json-schema-test-suite/validation/tests");
const testCaseUri = "https://test-suite.json-schema.org/";
const version = 2020;

/**
 * Skipped test files, test cases, and tests, as `|file|test case|test`
 * paths. A prefix skips everything under it.
 */
const skip = new Set([
  // A schema that wasn't retrieved from a file can't identify as one, for
  // security reasons
  "|id.json|$id with file URI still resolves pointers - *nix",
  "|id.json|$id with file URI still resolves pointers - windows"
]);

/**
 * Test files by name, with the test cases that apply to 2020-12
 *
 * @type Record<string, TestCase[]>
 */
const testFiles = {};
for (const entry of readdirSync(testsPath, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) {
    continue;
  }

  /** @type TestFile */
  const testFile = JSON.parse(readFileSync(join(testsPath, entry.name), "utf8"));
  const testCases = testFile.tests.filter((testCase) => isCompatible(testCase.compatibility, version));
  if (testCases.length > 0) {
    testFiles[entry.name] = testCases;
  }
}

/** @type (validateFormats?: boolean) => JsonSchema */
const draft202012JsonSchema = (validateFormats = false) => {
  const jsonSchema = testSuiteJsonSchema({ validateFormats });
  addDraft202012(jsonSchema);
  return jsonSchema;
};

// In 2020-12, `format` is an annotation by default. Test cases tagged
// `format-assertion` are run with formats validated. Each test case's schemas
// are only in its own session.
const jsonSchema = draft202012JsonSchema();
const formatAssertionJsonSchema = draft202012JsonSchema(true);

describe("JSON-Schema-Test-Suite 2020-12", () => {
  for (const file in testFiles) {
    describe(file, () => {
      const testCases = testFiles[file];
      for (let index = 0; index < testCases.length; index++) {
        const testCase = testCases[index];

        describe(testCase.description, () => {
          /** @type Validator */
          let validator;

          beforeAll(async () => {
            if (isSkipped(skip, [file, testCase.description])) {
              return;
            }

            const uri = `${testCaseUri}${file}/${index}`;
            const testCaseJsonSchema = testCase.tags?.includes("format-assertion") ? formatAssertionJsonSchema : jsonSchema;
            validator = await compileTestCase(testCaseJsonSchema, draft202012DialectUri, uri, testCase.schema, testCase.externalSchemas);
          });

          for (const { description, data, valid } of testCase.tests) {
            test.skipIf(isSkipped(skip, [file, testCase.description, description]))(description, () => {
              // Every way of evaluating should agree
              expect({
                validate: validator.validate(data),
                validateJson: validator.validateJson(JSON.stringify(data)),
                basic: validator.validate(data, { output: "BASIC" }).valid,
                annotate: validator.annotate(data).output
              }).to.eql({
                validate: valid,
                validateJson: valid,
                basic: valid,
                annotate: valid
              });
            });
          }
        });
      }
    });
  }
});
