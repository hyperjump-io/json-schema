import fs from "node:fs";
import { describe, it, expect, beforeAll } from "vitest";
import { registerSchema, validate } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { OasSchema30, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: OasSchema30;
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
const skip: Set<string> = new Set([
  // Skip tests that ignore keywords in places that are not schemas such as a
  // $ref in a const. Because this implementation is dialect agnostic, there's
  // no way to know whether a location is a schema or not. Especially since this
  // isn't a real problem that comes up with real schemas, I'm not concerned
  // about making it work.
  "|draft4|ref.json|naive replacement of $ref with its destination is not correct"
]);

// Ignore tests with keywords that OpenAPI 3.0 doesn't support
const ignore: Set<string> = new Set([
  "|draft4|additionalItems.json",
  "|draft4|additionalProperties.json|additionalProperties being false does not allow other properties",
  "|draft4|additionalProperties.json|non-ASCII pattern with additionalProperties",
  "|draft4|additionalProperties.json|additionalProperties with null valued instance properties",
  "|draft4|allOf.json|allOf with base schema",
  "|draft4|allOf.json|nested allOf, to check validation semantics",
  "|draft4|anyOf.json|nested anyOf, to check validation semantics",
  "|draft4|dependencies.json",
  "|draft4|id.json",
  "|draft4|infinite-loop-detection.json",
  "|draft4|items.json|an array of schemas for items",
  "|draft4|items.json|items and subitems",
  "|draft4|items.json|items with null instance elements",
  "|draft4|items.json|array-form items with null instance elements",
  "|draft4|not.json|not multiple types",
  "|draft4|oneOf.json|nested oneOf, to check validation semantics",
  "|draft4|patternProperties.json",
  "|draft4|properties.json|properties, patternProperties, additionalProperties interaction",
  "|draft4|properties.json|properties with null valued instance properties",
  "|draft4|properties.json|properties with null valued instance properties",
  "|draft4|ref.json|relative pointer ref to array",
  "|draft4|ref.json|escaped pointer ref",
  "|draft4|ref.json|nested refs",
  "|draft4|ref.json|ref overrides any sibling keywords",
  "|draft4|ref.json|$ref prevents a sibling id from changing the base uri",
  "|draft4|ref.json|property named $ref, containing an actual $ref",
  "|draft4|ref.json|Recursive references between schemas",
  "|draft4|ref.json|refs with quote",
  "|draft4|ref.json|Location-independent identifier",
  "|draft4|ref.json|Location-independent identifier with base URI change in subschema",
  "|draft4|ref.json|id must be resolved against nearest parent, not just immediate parent",
  "|draft4|ref.json|id with file URI still resolves pointers - *nix",
  "|draft4|ref.json|id with file URI still resolves pointers - windows",
  "|draft4|ref.json|empty tokens in $ref json-pointer",
  "|draft4|refRemote.json|ref within remote ref",
  "|draft4|refRemote.json|fragment within remote ref",
  "|draft4|refRemote.json|base URI change",
  "|draft4|refRemote.json|base URI change - change folder",
  "|draft4|refRemote.json|base URI change - change folder in subschema",
  "|draft4|refRemote.json|root ref in remote ref",
  "|draft4|refRemote.json|Location-independent identifier in remote ref",
  "|draft4|type.json|null type matches only the null object",
  "|draft4|type.json|multiple types can be specified in an array",
  "|draft4|type.json|type as array with one item",
  "|draft4|type.json|type: array or object",
  "|draft4|type.json|type: array, object or null",
  "|draft4|uniqueItems.json|uniqueItems with an array of items",
  "|draft4|uniqueItems.json|uniqueItems with an array of items and additionalItems=false",
  "|draft4|uniqueItems.json|uniqueItems=false with an array of items",
  "|draft4|uniqueItems.json|uniqueItems=false with an array of items and additionalItems=false"
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

const shouldIgnore = (path: string[]): boolean => {
  let key = "";
  for (const segment of path) {
    key = `${key}|${segment}`;
    if (ignore.has(key)) {
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
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as OasSchema30;
        if (!("$schema" in remote)) {
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
      .filter((entry) => !ignore.has(`|${draft}|${entry.name}`))
      .forEach((entry) => {
        const file = `${testSuiteFilePath}/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites
            .filter((suite) => !ignore.has(`|${draft}|${entry.name}|${suite.description}`))
            .forEach((suite) => {
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

                suite.tests.forEach((test) => {
                  if (shouldSkip([draft, entry.name, suite.description, test.description])) {
                    it.skip(test.description, () => { /* empty */ });
                  } else if (!shouldIgnore([draft, entry.name, suite.description, test.description])) {
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

runTestSuite("draft4", "https://spec.openapis.org/oas/3.0/dialect");
