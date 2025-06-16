import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { registerSchema, unregisterSchema, validate } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { OasSchema32, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: OasSchema32;
  tests: Test[];
};

type Test = {
  description: string;
  data: Json;
  valid: boolean;
};

// This package is indended to be a compatibility mode from stable JSON Schema.
// Some edge cases might not work exactly as specified, but it should work for
// any real-life schema.
const skip = new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|draft2020-12|ref.json|$id with file URI still resolves pointers - *nix",
  "|draft2020-12|ref.json|$id with file URI still resolves pointers - windows"
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
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as Exclude<OasSchema32, boolean>;
        if (!remote.$schema || toAbsoluteIri(remote.$schema as string) === "https://json-schema.org/draft/2020-12/schema") {
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

    fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${testSuiteFilePath}/${entry.name}`;

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
                url = `http://${draft}-test-suite.json-schema.org/${entry.name}/${encodeURIComponent(suite.description)}`;
                if (typeof suite.schema === "object" && suite.schema.$schema === "https://json-schema.org/draft/2020-12/schema") {
                  delete suite.schema.$schema;
                }
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

runTestSuite("draft2020-12", "https://spec.openapis.org/oas/3.2/dialect/base");
