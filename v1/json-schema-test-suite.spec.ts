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
  // v1 doesn't allow unknown keywords, so these don't apply.
  "|v1|optional/dependencies-compatibility.json",
  "|v1|optional/refOfUnknownKeyword.json",
  "|v1|optional/unknownKeyword.json",

  // `format` is an assertion in v1, so annotation-only tests don't apply.
  "|v1|optional/format-annotation.json",

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

const jsonFiles = (path: string): string[] => fs.readdirSync(path, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name);

// `optional/` is part of the suite and was never being read.
const testFiles = (path: string): [string, string][] => [
  ...jsonFiles(path).map((name): [string, string] => [name, `${path}/${name}`]),
  ...jsonFiles(`${import.meta.dirname}/extension-tests`).map((name): [string, string] => [name, `${import.meta.dirname}/extension-tests/${name}`]),
  ...jsonFiles(`${path}/format`).map((name): [string, string] => [name, `${path}/format/${name}`]),
  ...jsonFiles(`${path}/optional`).map((name): [string, string] => [`optional/${name}`, `${path}/optional/${name}`])
];

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

    testFiles(testSuiteFilePath)
      .forEach(([name, file]) => {
        describe(name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let _validate: Validator;
              let url: string;

              beforeAll(async () => {
                if (shouldSkip([draft, name, suite.description])) {
                  return;
                }
                url = `http://${draft}-test-suite.json-schema.org/${encodeURIComponent(name)}/${encodeURIComponent(suite.description)}`;
                registerSchema(suite.schema, url, dialectId);

                _validate = await validate(url);
              });

              afterAll(() => {
                unregisterSchema(url);
              });

              suite.tests.forEach((test) => {
                if (shouldSkip([draft, name, suite.description, test.description])) {
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
