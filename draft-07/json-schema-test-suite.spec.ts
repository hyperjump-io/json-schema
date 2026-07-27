import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { registerSchema, unregisterSchema, validate } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaDraft07, SchemaObject, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: JsonSchemaDraft07;
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
  // Cross-draft tests need remotes from other dialects. addRemotes only
  // registers remotes that match the dialect under test.
  "|draft7|optional/cross-draft.json",

  // contentEncoding/contentMediaType are annotations by default in draft-07.
  // These tests assume the optional assertion behavior.
  "|draft7|optional/content.json",

  // Skip tests for pointers that cross schema resource boundaries. There might
  // be a way to solve this, but because this functionality has been removed
  // from the spec and there is no good reason to do this, it will probably not
  // ever be fixed.
  "|draft7|refRemote.json|base URI change - change folder in subschema",

  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|draft7|ref.json|$id with file URI still resolves pointers - *nix",
  "|draft7|ref.json|$id with file URI still resolves pointers - windows"
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

// `optional/` is part of the suite. `optional/format` is covered separately by
// formats/formats-test-suite.spec.ts, so it's left out here.
const testFiles = (path: string): [string, string][] => [
  ...jsonFiles(path).map((name): [string, string] => [name, `${path}/${name}`]),
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

runTestSuite("draft7", "http://json-schema.org/draft-07/schema");
