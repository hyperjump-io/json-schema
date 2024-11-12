import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerSchema, unregisterSchema, validate } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchema, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: JsonSchema;
  tests: Test[];
};

type Test = {
  description: string;
  data: Json;
  valid: boolean;
};

// Tests are only skipped if I have good reason to decide not to fix them. This
// is usually because there has been some tradeoff I've made to not support
// something that doesn't come up in real schemas in favor of something that has
// value.
const skip = new Set<string>([
  // "filename.json|description"
]);

const shouldSkip = (path: string[]): boolean => {
  let index = 0;
  let key = path[index];
  do {
    if (skip.has(key)) {
      return true;
    }
    index += 1;
    key = `${key}|${path[index]}`;
  } while (index < path.length);

  return false;
};

const dialectId = "https://json-schema.org/validation";
const testSuitePath = `./stable/json-schema-test-suite`;

const addRemotes = (filePath = `${testSuitePath}/remotes`, url = "") => {
  fs.readdirSync(filePath, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as JsonSchema;
        registerSchema(remote, `http://localhost:1234${url}/${entry.name}`, dialectId);
      } else if (entry.isDirectory()) {
        addRemotes(`${filePath}/${entry.name}`, `${url}/${entry.name}`);
      }
    });
};

const runTestSuite = () => {
  describe(`JSON Schema Test Suite: ${dialectId}`, () => {
    fs.readdirSync(`${testSuitePath}/tests`, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${testSuitePath}/tests/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let _validate: Validator;
              let schemaId: string;
              const skipPath = [entry.name, suite.description];

              beforeAll(async () => {
                if (shouldSkip(skipPath)) {
                  return;
                }

                schemaId = `http://test-suite.json-schema.org/${encodeURIComponent(suite.description)}`;
                registerSchema(suite.schema, schemaId, dialectId);
                _validate = await validate(schemaId);
              });

              afterAll(() => {
                unregisterSchema(schemaId);
              });

              suite.tests.forEach((test) => {
                skipPath.push(test.description);
                if (shouldSkip(skipPath)) {
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

addRemotes();
runTestSuite();
