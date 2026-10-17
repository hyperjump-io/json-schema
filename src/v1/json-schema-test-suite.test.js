import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1 } from "./index.js";
import { MemoryUriSchemePlugin, isCompatible, isSkipped } from "./test-suite.js";
import { addFullFormats } from "../formats/full.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Validator } from "../json-schema.d.ts"
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
const proposalsPath = join(testsPath, "proposals");

/**
 * Directories of test files, by the name their files are reported under.
 * `extension-tests` has tests in the suite's format for keywords the suite
 * doesn't cover.
 *
 * @type Record<string, string>
 */
const testDirectories = { "": testsPath };
for (const entry of readdirSync(proposalsPath, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    testDirectories[`proposals/${entry.name}/`] = join(proposalsPath, entry.name);
  }
}
testDirectories["extension-tests/"] = join(import.meta.dirname, "extension-tests");

const testCaseUri = "https://test-suite.json-schema.org/";

/** In v1, `format` asserts by default */
const supportedTags = new Set(["format-assertion"]);

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

/** @type (testCase: TestCase) => boolean */
const appliesToV1 = (testCase) => {
  if (!isCompatible(testCase.compatibility)) {
    return false;
  }

  for (const tag of testCase.tags ?? []) {
    if (!supportedTags.has(tag)) {
      return false;
    }
  }

  return true;
};

/**
 * Test files by name, with the test cases that apply to v1
 *
 * @type Record<string, TestCase[]>
 */
const testFiles = {};
for (const prefix in testDirectories) {
  const path = testDirectories[prefix];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    /** @type TestFile */
    const testFile = JSON.parse(readFileSync(join(path, entry.name), "utf8"));

    /** @type TestCase[] */
    const testCases = [];
    for (const testCase of testFile.tests) {
      if (appliesToV1(testCase)) {
        testCases.push(testCase);
      }
    }

    if (testCases.length > 0) {
      testFiles[`${prefix}${entry.name}`] = testCases;
    }
  }
}

describe("JSON-Schema-Test-Suite v1", () => {
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

            // External schema URIs aren't unique across test cases, so each
            // test case gets its own JsonSchema
            const uri = `${testCaseUri}${file}/${index}`;
            const jsonSchema = new JsonSchema();
            addV1(jsonSchema);
            addFullFormats(jsonSchema);
            jsonSchema.addUriSchemePlugin(new MemoryUriSchemePlugin({
              ...testCase.externalSchemas,
              [uri]: testCase.schema
            }));

            validator = await jsonSchema.compile(uri);
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
