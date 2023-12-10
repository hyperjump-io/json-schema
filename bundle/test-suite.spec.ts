import { readFile } from "node:fs/promises";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { isCompatible, md5, loadSchemas, unloadSchemas, testSuite } from "./test-utils.js";
import { addSchema, validate } from "../lib/index.js";
import { VERBOSE, setExperimentalKeywordEnabled } from "../lib/experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import { bundle, FLAT, FULL, URI, UUID } from "./index.js";

import type { SchemaObject } from "../lib/schema.js";
import type { BundleOptions } from "./index.js";
import type { OutputUnit } from "../lib/index.js";


setExperimentalKeywordEnabled("https://json-schema.org/keyword/dynamicRef", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/propertyDependencies", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/requireAllExcept", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/itemPattern", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/conditional", true);

const suite = testSuite("./bundle/tests");

const combine = (lists: unknown[][], items: unknown[]) => items.flatMap((item) => lists.map((list: unknown[]): unknown[] => [...list, item]));
const combinations = (...lists: unknown[][]) => lists.reduce(combine, [[]]);

const bundleMode = [FLAT, FULL];
const definitionNamingStrategy = [URI, UUID];

const config = combinations(bundleMode, definitionNamingStrategy) as [
  BundleOptions["bundleMode"],
  BundleOptions["definitionNamingStrategy"]
][];

const testRunner = (version: number, dialect: string) => {
  describe(dialect, () => {
    for (const testCase of suite) {
      if (!isCompatible(testCase.compatibility, version)) {
        continue;
      }

      describe(testCase.description, () => {
        const mainSchemaUri = "https://bundler.hyperjump.io/main";

        for (const [bundleMode, definitionNamingStrategy] of config) {
          const options = { bundleMode, definitionNamingStrategy };
          describe(JSON.stringify(options), () => {
            let bundledSchema: SchemaObject;

            beforeAll(async () => {
              loadSchemas(testCase, mainSchemaUri, dialect);
              bundledSchema = await bundle(mainSchemaUri, options);
              unloadSchemas(testCase, mainSchemaUri, dialect);
            });

            afterEach(() => {
              unloadSchemas(testCase, mainSchemaUri, dialect);
            });

            testCase.tests.forEach((test, testIndex) => {
              it(test.description, async () => {
                addSchema(bundledSchema, mainSchemaUri, dialect);
                const output = await validate(mainSchemaUri, test.instance, VERBOSE);

                const testId = md5(`${version}|${dialect}|${testCase.description}|${testIndex}`);
                const expectedOutputJson = await readFile(`./bundle/snapshots/${testId}`, "utf-8");
                const expectedOutput = JSON.parse(expectedOutputJson) as OutputUnit;
                expect(output).to.eql(expectedOutput);
              });
            });
          });
        }
      });
    }
  });
};

describe("bundle", () => {
  testRunner(9999, "https://json-schema.org/validation");
  testRunner(2020, "https://json-schema.org/draft/2020-12/schema");
  testRunner(2019, "https://json-schema.org/draft/2019-09/schema");
  testRunner(7, "http://json-schema.org/draft-07/schema");
  testRunner(6, "http://json-schema.org/draft-06/schema");
  testRunner(4, "http://json-schema.org/draft-04/schema");
});
