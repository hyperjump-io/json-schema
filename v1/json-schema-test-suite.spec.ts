import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { registerSchema, unregisterSchema, validate } from "./index.js";
import "../formats/index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaV1, SchemaObject, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: JsonSchemaV1;
  tests: Test[];
};

type Test = {
  description: string;
  data: Json;
  valid: boolean;
};

const skip = new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|v1|ref.json|$id with file URI still resolves pointers - *nix",
  "|v1|ref.json|$id with file URI still resolves pointers - windows",

  // Leap seconds don't make sense without a date
  "|v1|time.json|validation of time strings|a valid time string with leap second, Zulu",
  "|v1|time.json|validation of time strings|valid leap second, zero time-offset",
  "|v1|time.json|validation of time strings|valid leap second, positive time-offset",
  "|v1|time.json|validation of time strings|valid leap second, large positive time-offset",
  "|v1|time.json|validation of time strings|valid leap second, negative time-offset",
  "|v1|time.json|validation of time strings|valid leap second, large negative time-offset"
]);

const shouldSkip = (path: string[]): boolean => {
  let key = "";
  for (const segment of path) {
    key = `${key}|${segment}`;
    if (skip.has(key)) {
      return true;
    }
  }
  return false;
};

const testSuitePath = "./node_modules/json-schema-test-suite";

const addRemotes = (dialectId: string, filePath = `${testSuitePath}/remotes`, url = "") => {
  fs.readdirSync(filePath, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as SchemaObject;
        if (!remote.$schema || toAbsoluteIri(remote.$schema as string) === dialectId) {
          registerSchema(remote, `http://localhost:1234${url}/${entry.name}`, dialectId);
        }
      } else if (entry.isDirectory()) {
        addRemotes(dialectId, `${filePath}/${entry.name}`, `${url}/${entry.name}`);
      }
    });
};

const runTestSuite = (draft: string, dialectId: string) => {
  const testSuiteFilePath = `${testSuitePath}/tests/${draft}`;

  describe(`${draft} ${dialectId}`, () => {
    beforeAll(() => {
      addRemotes(dialectId);
    });

    [
      ...fs.readdirSync(testSuiteFilePath, { withFileTypes: true }),
      ...fs.readdirSync(`${testSuiteFilePath}/format`, { withFileTypes: true })
    ]
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${entry.parentPath}/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let _validate: Validator;
              let url: string;

              beforeAll(async () => {
                if (shouldSkip([draft, entry.name, suite.description])) {
                  return;
                }
                url = `http://${draft}-test-suite.json-schema.org/${encodeURIComponent(suite.description)}`;
                registerSchema(suite.schema, url, dialectId);

                _validate = await validate(url);
              });

              afterAll(() => {
                unregisterSchema(url);
              });

              suite.tests.forEach((test) => {
                if (shouldSkip([draft, entry.name, suite.description, test.description])) {
                  it.skip(test.description, () => { /* empty */ });
                } else {
                  it(test.description, () => {
                    const output = _validate(test.data);
                    expect(output.valid).to.equal(test.valid);
                  });
                }
              });
            });
          });
        });
      });
  });
};

runTestSuite("v1", "https://json-schema.org/v1");
