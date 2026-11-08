import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { JsonPointerError, jsonPointerGet } from "@hyperjump/browser";
import { resolveId, toId } from "../src/identifiers.js";
import { JsonSchema } from "../src/json-schema.js";
import { SchemaRegistry } from "../src/registry/schema-registry.js";
import { fullFormats } from "../src/formats/full.js";
import { BASIC } from "../src/output/index.js";
import { compile } from "../src/operations/compile.js";
import { annotatorFor, validatorFor } from "../src/operations/validate-compiled.js";

/**
 * @import { Json, JsonNode } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../src/json-schema.d.ts"
 * @import { CompiledSchema } from "../src/operations/compile.d.ts"
 * @import { DialectConfig } from "../src/dialect.d.ts"
 */

/**
 * @typedef {{
 *   description: string;
 *   tests: ValidationTestCase[];
 * }} ValidationTestFile
 *
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   tags?: string[];
 *   schema: Json;
 *   externalSchemas?: Record<string, Json>;
 *   tests: ValidationTest[];
 * }} ValidationTestCase
 *
 * @typedef {{
 *   description: string;
 *   data: Json;
 *   valid: boolean;
 * }} ValidationTest
 */

/**
 * @typedef {{
 *   description: string;
 *   suite: AnnotationTestCase[];
 * }} AnnotationTestFile
 *
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   schema: Json;
 *   externalSchemas?: Record<string, Json>;
 *   tests: AnnotationTest[];
 * }} AnnotationTestCase
 *
 * @typedef {{
 *   instance: Json;
 *   assertions: AnnotationAssertion[];
 * }} AnnotationTest
 *
 * @typedef {{
 *   location: string;
 *   keyword: string;
 *   expected: Record<string, Json>;
 * }} AnnotationAssertion
 */

// Shared by the JSON-Schema-Test-Suite runners

/** The suite's validation tests */
export const validationTestsPath = join(import.meta.dirname, "../node_modules/json-schema-test-suite/validation/tests");

const validationTestCaseUri = "https://test-suite.json-schema.org/";

const annotationTestsPath = join(import.meta.dirname, "../node_modules/json-schema-test-suite/annotations/tests");
const annotationTestCaseUri = "https://annotation-test-suite.json-schema.org/";

/**
 * Whether a test case's `compatibility` includes a release. Releases are
 * numbered by year, except v1, which is in the spec but not released, so the
 * suite calls it 9999. This is the algorithm from the suite's README.
 *
 * @type (compatibility: string | undefined, version: number) => boolean
 */
export const isCompatible = (compatibility, version) => {
  if (compatibility === undefined) {
    return true;
  }

  let isValid = true;
  for (const constraint of compatibility.split(",")) {
    const [, operator, constraintVersion] = /** @type RegExpExecArray */ (/^(<=|=)?(\d+)$/.exec(constraint));
    const releaseVersion = Number(constraintVersion);

    if (operator === "<=") {
      isValid = version <= releaseVersion;
    } else if (operator === "=") {
      isValid = version === releaseVersion;
    } else {
      isValid = version >= releaseVersion;
    }

    if (version <= releaseVersion) {
      break;
    }
  }

  return isValid;
};

/**
 * Whether a test file, test case, or test is skipped. Skipped paths are
 * `|file|test case|test`, and a prefix skips everything under it.
 *
 * @type (skip: Set<string>, path: string[]) => boolean
 */
export const isSkipped = (skip, path) => {
  let key = "";
  for (const segment of path) {
    key = `${key}|${segment}`;
    if (skip.has(key)) {
      return true;
    }
  }
  return false;
};

/**
 * A JsonSchema for running test cases. Every test case's schemas are in a
 * session registry, so nothing is retrieved. The suite's URIs aren't real,
 * so nothing is allowed to make sure of that.
 *
 * @type (config?: JsonSchemaConfig) => JsonSchema
 */
export const testSuiteJsonSchema = (config) => {
  const jsonSchema = new JsonSchema({ allowRetrieval: [], ...config, formats: fullFormats });

  return jsonSchema;
};

/**
 * Compile a test case's schema. External schema URIs aren't unique across
 * test cases, so each test case has its own registry. The suite's schemas
 * don't have `$schema`, so the dialect under test is given for them.
 *
 * @type (jsonSchema: JsonSchema, dialectUri: string, uri: string, schema: Json, externalSchemas?: Record<string, Json>) => Promise<CompiledSchema>
 */
export const compileTestCase = async (jsonSchema, dialectUri, uri, schema, externalSchemas = {}) => {
  const registry = new SchemaRegistry([
    ...Object.entries(externalSchemas).map(([retrievalUri, schema]) => ({ schema, retrievalUri, dialectUri })),
    { schema, retrievalUri: uri, dialectUri }
  ]);

  // A schema is identified by its `$id`, which is relative to the URI it was
  // retrieved from
  const id = typeof schema === "object" && schema !== null && !Array.isArray(schema) && typeof schema.$id === "string"
    ? resolveId(schema.$id, toId(uri))
    : uri;

  return compile(jsonSchema, id, { registry });
};

/**
 * @typedef {{
 *   description: string;
 *   version: number;
 *   dialectUri: string;
 *   jsonSchema: (testCase: ValidationTestCase) => JsonSchema;
 *   applies?: (testCase: ValidationTestCase) => boolean;
 *   testDirectories?: Record<string, string>;
 *   skip?: Set<string>;
 * }} ValidationTestSuiteOptions
 */

/**
 * Run the validation test cases that are compatible with a release. Every
 * way of evaluating a test has to agree.
 *
 * - `jsonSchema`: The JsonSchema a test case runs with. Each test case's
 *   schemas are only in its own session, so it can be shared.
 * - `applies`: Whether a compatible test case applies, such as by its tags
 * - `testDirectories`: Directories of test files, by the name their files
 *   are reported under. Defaults to the suite's validation tests.
 * - `skip`: Skipped test files, test cases, and tests (see {@link isSkipped})
 *
 * @type (options: ValidationTestSuiteOptions) => void
 */
export const describeValidationTestSuite = (options) => {
  const {
    description,
    version,
    dialectUri,
    jsonSchema,
    applies = () => true,
    testDirectories = { "": validationTestsPath },
    skip = new Set()
  } = options;

  /** @type Record<string, ValidationTestCase[]> */
  const testFiles = {};
  for (const prefix in testDirectories) {
    const path = testDirectories[prefix];
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      /** @type ValidationTestFile */
      const testFile = JSON.parse(readFileSync(join(path, entry.name), "utf8"));
      const testCases = testFile.tests.filter((testCase) => isCompatible(testCase.compatibility, version) && applies(testCase));
      if (testCases.length > 0) {
        testFiles[`${prefix}${entry.name}`] = testCases;
      }
    }
  }

  describe(description, () => {
    for (const file in testFiles) {
      describe(file, () => {
        const testCases = testFiles[file];
        for (let index = 0; index < testCases.length; index++) {
          const testCase = testCases[index];

          describe(testCase.description, () => {
            /** @type CompiledSchema */
            let compiled;

            beforeAll(async () => {
              if (isSkipped(skip, [file, testCase.description])) {
                return;
              }

              const uri = `${validationTestCaseUri}${file}/${index}`;
              compiled = await compileTestCase(jsonSchema(testCase), dialectUri, uri, testCase.schema, testCase.externalSchemas);
            });

            for (const { description, data, valid } of testCase.tests) {
              test.skipIf(isSkipped(skip, [file, testCase.description, description]))(description, () => {
                expect({
                  validate: validatorFor(compiled)(data),
                  validateJson: validatorFor(compiled, { input: "json" })(JSON.stringify(data)),
                  basic: validatorFor(compiled, { output: BASIC })(data).valid,
                  annotate: annotatorFor(compiled)(data).output
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
};

/**
 * @typedef {{
 *   description: string;
 *   version: number;
 *   dialect: DialectConfig;
 *   jsonSchema: JsonSchema;
 *   skip?: Set<string>;
 * }} AnnotationTestSuiteOptions
 */

/**
 * Run the annotation test cases that are compatible with a release, with
 * `annotate` and `annotateJson`. The suite names keywords, which are
 * identified by their URIs in `dialect`.
 *
 * - `jsonSchema`: Each test case's schemas are only in its own session, so
 *   one JsonSchema runs every test case.
 * - `skip`: Skipped test files, test cases, and tests (see {@link isSkipped}).
 *   A test is identified by its instance as JSON.
 *
 * @type (options: AnnotationTestSuiteOptions) => void
 */
export const describeAnnotationTestSuite = ({ description, version, dialect, jsonSchema, skip = new Set() }) => {
  /** @type Record<string, AnnotationTestCase[]> */
  const testFiles = {};
  for (const entry of readdirSync(annotationTestsPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    /** @type AnnotationTestFile */
    const testFile = JSON.parse(readFileSync(join(annotationTestsPath, entry.name), "utf8"));
    const testCases = testFile.suite.filter((testCase) => isCompatible(testCase.compatibility, version));
    if (testCases.length > 0) {
      testFiles[entry.name] = testCases;
    }
  }

  const session = jsonSchema.session();

  /**
   * The annotations a keyword added to the node at an instance location. A
   * location that isn't in the instance has none.
   *
   * @type (node: JsonNode, location: string, keyword: string) => unknown[]
   */
  const annotationsAt = (node, location, keyword) => {
    /** @type JsonNode | undefined */
    let subject;
    try {
      subject = /** @type JsonNode | undefined */ (jsonPointerGet(location, node));
    } catch (error) {
      if (error instanceof JsonPointerError) {
        return [];
      }
      throw error;
    }

    return subject === undefined ? [] : session.annotation(subject, keyword, dialect.uri);
  };

  describe(description, () => {
    for (const file in testFiles) {
      describe(file, () => {
        const testCases = testFiles[file];
        for (let index = 0; index < testCases.length; index++) {
          const testCase = testCases[index];

          describe(testCase.description, () => {
            /** @type CompiledSchema */
            let compiled;

            beforeAll(async () => {
              if (isSkipped(skip, [file, testCase.description])) {
                return;
              }

              const uri = `${annotationTestCaseUri}${file}/${index}`;
              compiled = await compileTestCase(jsonSchema, dialect.uri, uri, testCase.schema, testCase.externalSchemas);
            });

            for (const { instance, assertions } of testCase.tests) {
              const description = JSON.stringify(instance);
              test.skipIf(isSkipped(skip, [file, testCase.description, description]))(description, () => {
                // Both ways of annotating should agree
                const nodes = {
                  annotate: annotatorFor(compiled)(instance).node,
                  annotateJson: annotatorFor(compiled, { input: "json" })(JSON.stringify(instance)).node
                };

                // The suite orders the expected annotations by convention
                // only, and annotations aren't identified by the schema they
                // came from, so only the values are compared
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
};
