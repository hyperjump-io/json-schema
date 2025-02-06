import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { registerSchema, unregisterSchema, validate } from "./index.js";
import { formatValidators } from "../lib/format/formatValidator.js";
import { setValidateFormats } from "../lib/configuration.js";

import type { Json } from "@hyperjump/json-pointer";
import type { JsonSchemaDraft202012, SchemaObject, Validator } from "./index.js";


type Suite = {
  description: string;
  schema: JsonSchemaDraft202012;
  tests: Test[];
};

type Test = {
  description: string;
  data: Json;
  valid: boolean;
};

const skip = new Set<string>([
  "|draft2020-12|optional/format/.*"
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

const runOptionalFormatTests = (draft: string, dialectId: string) => {
  const optionalTestPath = `${testSuitePath}/tests/${draft}/optional/format/date.json`; // Path to the "date.json" test file

  describe(`${draft} ${dialectId} - Format validation Tests for draft-2020-12`, () => {
    beforeAll(() => {
      addRemotes(dialectId);
      setValidateFormats(true);
    });

    afterAll(() => {
      setValidateFormats(false);
    });

    const file = optionalTestPath;
    describe("optional/format/date.json", () => {
      const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

      suites.forEach((suite) => {
        describe(suite.description, () => {
          let _validate: Validator;
          let url: string;

          beforeAll(async () => {
            if (shouldSkip([draft, "optional/format/date.json", suite.description])) {
              return;
            }
            url = `http://${draft}-test-suite.json-schema.org/optional/${encodeURIComponent(suite.description)}`;
            registerSchema(suite.schema, url, dialectId);

            _validate = await validate(url);
          });

          afterAll(() => {
            unregisterSchema(url);
          });

          suite.tests.forEach((test) => {
            if (shouldSkip([draft, "optional/format/date.json", suite.description, test.description])) {
              it.skip(test.description, () => { /* empty */ });
            } else {
              it(test.description, () => {
                const output = _validate(test.data);
                expect(output.valid).to.equal(test.valid);

                const isValidDate = formatValidators.date(test.data);

                if (test.valid) {
                  expect(isValidDate).toBe(true);
                } else {
                  expect(isValidDate).toBe(false);
                }
              });
            }
          });
        });
      });
    });
  });
};

runOptionalFormatTests("draft2020-12", "https://json-schema.org/draft/2020-12/schema");
