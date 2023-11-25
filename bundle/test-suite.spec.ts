import { basename, relative } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { expect } from "chai";
import { getKeywordName } from "../lib/keywords.js";
import { addSchema, validate } from "../lib/index.js";
import { VERBOSE, setExperimentalKeywordEnabled } from "../lib/experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import { bundle, FLAT, FULL, URI, UUID } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { SchemaObject } from "../lib/schema.js";
import type { BundleOptions } from "./index.js";
import type { OutputUnit } from "../lib/index.js";


type TestCase = {
  description: string;
  compatibility?: string;
  requiredDialects?: string[];
  schema: SchemaObject;
  externalSchemas: Record<string, SchemaObject>;
  tests: Test[];
};

type Test = {
  description: string,
  instance: Json
};

setExperimentalKeywordEnabled("https://json-schema.org/keyword/dynamicRef", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/propertyDependencies", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/requireAllExcept", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/itemPattern", true);
setExperimentalKeywordEnabled("https://json-schema.org/keyword/conditional", true);

const isCompatible = (compatibility: string | undefined, versionUnderTest: number): boolean => {
  if (compatibility === undefined) {
    return true;
  }

  const constraints = compatibility.split(",");
  for (const constraint of constraints) {
    const matches = /(?<operator><=|>=|=)?(?<version>\d+)/.exec(constraint);
    if (!matches) {
      throw Error(`Invalid compatibility string: ${compatibility}`);
    }

    const operator = matches[1] ?? ">=";
    const version = parseInt(matches[2], 10);

    switch (operator) {
      case ">=":
        if (versionUnderTest < version) {
          return false;
        }
        break;
      case "<=":
        if (versionUnderTest > version) {
          return false;
        }
        break;
      case "=":
        if (versionUnderTest !== version) {
          return false;
        }
        break;
      default:
        throw Error(`Unsupported contraint operator: ${operator}`);
    }
  }

  return true;
};

const combine = (lists: unknown[][], items: unknown[]) => items.flatMap((item) => lists.map((list: unknown[]): unknown[] => [...list, item]));
const combinations = (...lists: unknown[][]) => lists.reduce(combine, [[]]);

const bundleMode = [FLAT, FULL];
const definitionNamingStrategy = [URI, UUID];

const config = combinations(bundleMode, definitionNamingStrategy) as [
  BundleOptions["bundleMode"],
  BundleOptions["definitionNamingStrategy"]
][];

const suite: TestCase[] = [];
readdirSync(`./bundle/tests`, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .forEach((entry) => {
    const file = `./bundle/tests/${entry.name}`;
    const testCases = JSON.parse(readFileSync(file, "utf8")) as TestCase[];
    suite.push(...testCases);
  });

const fixtures: Record<string, SchemaObject> = {};
readdirSync("bundle/fixtures", { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
  .forEach((entry) => {
    const path = relative("bundle/fixtures", `${entry.path}/${basename(entry.name, ".schema.json")}`);
    const retrievalUri = `https://bundler.hyperjump.io/${path}`;
    const fixture = JSON.parse(readFileSync(`${entry.path}/${entry.name}`, "utf8")) as SchemaObject;
    fixtures[retrievalUri] = fixture;
  });

const loadSchemas = (testCase: TestCase, retrievalUri: string, dialect: string) => {
  const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");

  if (!testCase.schema[definitionsToken]) {
    testCase.schema[definitionsToken] = {};
  }

  addSchema(testCase.schema, retrievalUri, dialect);

  for (const retrievalUri in fixtures) {
    addSchema(fixtures[retrievalUri], retrievalUri, dialect);
  }

  for (const retrievalUri in testCase.externalSchemas) {
    addSchema(testCase.externalSchemas[retrievalUri], retrievalUri, dialect);
  }
};

const testRunner = (version: number, dialect: string) => {
  describe(dialect, () => {
    for (const testCase of suite) {
      if (!isCompatible(testCase.compatibility, version)) {
        continue;
      }

      describe(testCase.description, () => {
        const mainSchemaUri = "https://bundler.hyperjump.io/main";
        const expectedOutput: OutputUnit[] = [];

        before(async () => {
          for (const test of testCase.tests) {
            loadSchemas(testCase, mainSchemaUri, dialect);
            expectedOutput.push(await validate(mainSchemaUri, test.instance, VERBOSE));
          }
        });

        for (const [bundleMode, definitionNamingStrategy] of config) {
          const options = { bundleMode, definitionNamingStrategy };
          describe(JSON.stringify(options), () => {
            let bundledSchema: SchemaObject;

            before(async () => {
              loadSchemas(testCase, mainSchemaUri, dialect);
              bundledSchema = await bundle(mainSchemaUri);
            });

            testCase.tests.forEach((test, testId) => {
              it(test.description, async () => {
                addSchema(bundledSchema, mainSchemaUri, dialect);
                const output = await validate(mainSchemaUri, test.instance, VERBOSE);

                expect(output).to.eql(expectedOutput[testId]);
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
