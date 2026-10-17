import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { JsonPointerError, pointerGet } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1Dialect } from "./index.js";
import { MemoryUriSchemePlugin, isCompatible, isSkipped } from "./test-suite.js";

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

/**
 * Skipped test files, test cases, and tests, as `|file|test case|test`
 * paths. A prefix skips everything under it.
 */
const skip = new Set([
  // Keywords that aren't implemented yet
  "|format.json",

  // It's a 2020-12 schema
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
    if (isCompatible(testCase.compatibility)) {
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

            // External schema URIs aren't unique across test cases, so each
            // test case gets its own JsonSchema
            const uri = `${testCaseUri}${file}/${index}`;
            const jsonSchema = new JsonSchema();
            addV1(jsonSchema);
            jsonSchema.addUriSchemePlugin(new MemoryUriSchemePlugin({
              ...testCase.externalSchemas,
              [uri]: testCase.schema
            }));

            validator = await jsonSchema.compile(uri);
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
