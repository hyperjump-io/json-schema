import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, beforeAll, expect } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { UriSchemePlugin } from "@hyperjump/browser"
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

/**
 * The suite's number for v1. It's in the spec but not released, which the
 * suite calls 9999.
 */
const version = 9999;

/** In v1, `format` asserts by default */
const supportedTags = new Set(["format-assertion"]);

/**
 * Skipped test files, test cases, and tests, as `|file|test case|test`
 * paths. A prefix skips everything under it.
 */
const skip = new Set([
  // Keywords that aren't implemented yet
  "|anchor.json",
  "|content.json",
  "|default.json",
  "|dynamicRef.json",
  "|format-date-time.json",
  "|format-date.json",
  "|format-duration.json",
  "|format-email.json",
  "|format-hostname.json",
  "|format-idn-email.json",
  "|format-idn-hostname.json",
  "|format-ipv4.json",
  "|format-ipv6.json",
  "|format-iri-reference.json",
  "|format-iri.json",
  "|format-json-pointer.json",
  "|format-regex.json",
  "|format-relative-json-pointer.json",
  "|format-time.json",
  "|format-uri-reference.json",
  "|format-uri-template.json",
  "|format-uri.json",
  "|format-uuid.json",
  "|id.json",
  "|infinite-loop-detection.json",
  "|ref.json",
  "|unevaluatedItems.json",
  "|unevaluatedProperties.json",
  "|proposals/propertyDependencies/dynamicRef.json",
  "|proposals/propertyDependencies/unevaluatedProperties.json",

  // Test cases that need keywords that aren't implemented yet
  "|items.json|items and subitems",
  "|not.json|collect annotations inside a 'not', even if collection is disabled",
  "|extension-tests/conditional.json|if - then - else with unevaluatedProperties",
  "|extension-tests/conditional.json|if - then - else with unevaluatedItems"
]);

/** @type (path: string[]) => boolean */
const shouldSkip = (path) => {
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
 * Whether a test case's `compatibility` includes {@link version}. This is
 * the algorithm from the suite's README.
 *
 * @type (compatibility: string | undefined) => boolean
 */
const isCompatible = (compatibility) => {
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
 * Serves schemas from memory instead of `http(s):`, so the suite doesn't
 * need a server. The suite's schemas don't have `$schema`, so they're served
 * as v1.
 *
 * @implements UriSchemePlugin
 */
class MemoryUriSchemePlugin {
  /** @type Record<string, Json> */
  #schemas;

  /**
   * @param {Record<string, Json>} schemas
   */
  constructor(schemas) {
    this.schemes = ["http", "https"];

    this.#schemas = schemas;
  }

  /** @type UriSchemePlugin["retrieve"] */
  async retrieve(uri) {
    const id = toAbsoluteIri(uri);
    if (!(id in this.#schemas)) {
      throw Error(`'${id}' isn't in the test case`);
    }

    const response = new Response(JSON.stringify(this.#schemas[id]), {
      headers: { "Content-Type": `application/schema+json; schema="${v1DialectUri}"` }
    });
    Object.defineProperty(response, "url", { value: id });

    return response;
  }
}

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
            if (shouldSkip([file, testCase.description])) {
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

          for (const { description, data, valid } of testCase.tests) {
            test.skipIf(shouldSkip([file, testCase.description, description]))(description, () => {
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
