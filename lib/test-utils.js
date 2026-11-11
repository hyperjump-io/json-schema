import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { registerSchema, unregisterSchema, validate } from "./index.js";


const defaultTestSuitePath = "./node_modules/json-schema-test-suite/validation/tests";

export const runTestSuite = (draft, dialectId, skip, options = {}) => {
  const {
    testSuitePath = defaultTestSuitePath,
    include = "**/*.json",
    exclude = ["optional"],
    tags = new Set()
  } = options;

  describe(`${draft} ${dialectId}`, async () => {
    for await (const entry of fs.glob(include, { cwd: testSuitePath, exclude })) {
      const file = path.join(testSuitePath, entry);
      const suite = JSON.parse(await fs.readFile(file, "utf8"));

      const testCases = suite.tests.filter((testCase) => {
        return isCompatible(testCase.compatibility, draft)
          && (testCase.tags ?? []).every((tag) => tags.has(tag))
          && !shouldSkip(skip, [`${draft}`, entry, testCase.description]);
      });
      if (testCases.length === 0) {
        continue;
      }

      describe(suite.description, () => {
        for (const testCase of testCases) {
          describe(testCase.description, () => {
            let _validate;
            let url;

            beforeAll(async () => {
              for (const remoteUri in testCase.externalSchemas) {
                registerSchema(testCase.externalSchemas[remoteUri], remoteUri, dialectId);
              }

              url = `http://${draft}-test-suite.json-schema.org/${encodeURIComponent(testCase.description)}`;
              registerSchema(testCase.schema, url, dialectId);

              _validate = await validate(url);
            });

            afterAll(() => {
              unregisterSchema(url);

              for (const remoteUri in testCase.externalSchemas) {
                unregisterSchema(remoteUri);
              }
            });

            for (const test of testCase.tests) {
              it(test.description, () => {
                const output = _validate(test.data);
                expect(output.valid).to.equal(test.valid);
              });
            }
          });
        }
      });
    }
  });
};

const shouldSkip = (skip, path) => {
  let key = "";
  for (const segment of path) {
    key = `${key}|${segment}`;
    if (skip.has(key)) {
      return true;
    }
  }
  return false;
};

export const isCompatible = (compatibility, versionUnderTest) => {
  let isValid = true;

  for (const constraint of compatibility?.split(",") ?? []) {
    const matches = /^(?<operator><=|>=|=)?(?<version>\d+)$/.exec(constraint);
    if (!matches) {
      throw Error(`Invalid compatibility string: ${compatibility}`);
    }

    const operator = matches[1] ?? ">=";
    const version = parseInt(matches[2], 10);

    switch (operator) {
      case ">=":
        isValid = versionUnderTest >= version;
        break;
      case "<=":
        isValid = versionUnderTest <= version;
        break;
      case "=":
        isValid = versionUnderTest === version;
        break;
    }

    if (versionUnderTest <= version) {
      break;
    }
  }

  return isValid;
};
