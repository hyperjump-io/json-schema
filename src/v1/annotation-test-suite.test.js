import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { JsonPointerError, pointerGet } from "@hyperjump/browser/json";
import { v1Dialect, v1DialectUri } from "./index.js";
import { compileTestCase, isCompatible, isSkipped, testSuiteJsonSchema } from "../test-suite.js";

/**
 * @import { Json, JsonNode } from "@hyperjump/browser/json"
 * @import { Validator } from "../json-schema.d.ts"
 */

/**
 * @typedef {{
 *   description: string;
 *   suite: TestCase[];
 * }} TestFile
 *
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   schema: Json;
 *   externalSchemas?: Record<string, Json>;
 *   tests: Test[];
 * }} TestCase
 *
 * @typedef {{
 *   instance: Json;
 *   assertions: Assertion[];
 * }} Test
 *
 * @typedef {{
 *   location: string;
 *   keyword: string;
 *   expected: Record<string, Json>;
 * }} Assertion
 */

const testsPath = join(import.meta.dirname, "../../node_modules/json-schema-test-suite/annotations/tests");
const testCaseUri = "https://annotation-test-suite.json-schema.org/";

/** v1 is in the spec but not released, so the suite calls it 9999 */
const version = 9999;

/**
 * Skipped test files, test cases, and tests, as `|file|test case|test`
 * paths. A prefix skips everything under it.
 */
const skip = new Set([
  // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
  // merged yet.
  "|unknown.json|`unknownKeyword` is an annotation"
]);

/**
 * Test files by name, with the test cases that apply to v1
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

  /** @type TestCase[] */
  const testCases = [];
  for (const testCase of testFile.suite) {
    if (isCompatible(testCase.compatibility, version)) {
      testCases.push(testCase);
    }
  }

  if (testCases.length > 0) {
    testFiles[entry.name] = testCases;
  }
}

/**
 * The annotations a keyword added to the node at an instance location. A
 * keyword's annotations are identified by its URI. A location that isn't in
 * the instance has none.
 *
 * @type (node: JsonNode, location: string, keyword: string) => unknown[]
 */
const annotationsAt = (node, location, keyword) => {
  const keywordUri = v1Dialect.keywords[keyword] ?? `https://json-schema.org/keyword/unknown#${keyword}`;

  /** @type JsonNode | undefined */
  let subject;
  try {
    subject = /** @type JsonNode | undefined */ (pointerGet(location, node));
  } catch (error) {
    if (error instanceof JsonPointerError) {
      return [];
    }
    throw error;
  }

  return subject?.data?.annotations?.get(keywordUri) ?? [];
};

// One JsonSchema for every test case. Each test case's schemas are only in its
// own session.
const jsonSchema = testSuiteJsonSchema();

describe("JSON-Schema-Test-Suite v1 annotations", () => {
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
            validator = await compileTestCase(jsonSchema, v1DialectUri, uri, testCase.schema, testCase.externalSchemas);
          });

          for (const { instance, assertions } of testCase.tests) {
            const description = JSON.stringify(instance);
            test.skipIf(isSkipped(skip, [file, testCase.description, description]))(description, () => {
              // Both ways of annotating should agree
              const nodes = {
                annotate: validator.annotate(instance).node,
                annotateJson: validator.annotateJson(JSON.stringify(instance)).node
              };

              // The suite orders the expected annotations by convention only,
              // and annotations aren't identified by the schema they came
              // from, so only the values are compared
              for (const method in nodes) {
                const node = /** @type JsonNode */ (nodes[/** @type keyof typeof nodes */ (method)]);
                for (const { location, keyword, expected } of assertions) {
                  expect(annotationsAt(node, location, keyword), `${method}: ${keyword} at '${location}'`)
                    .to.have.deep.members(Object.values(expected));
                }
              }
            });
          }
        });
      }
    });
  }
});
