import fs from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerSchema, unregisterSchema, validate } from "../lib/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import { setShouldValidateFormat } from "./index.js";

import type { Json } from "@hyperjump/json-pointer";
import type { SchemaObject, Validator } from "../lib/index.js";


type Suite = {
  description: string;
  schema: SchemaObject;
  tests: Test[];
};

type Test = {
  description: string;
  data: Json;
  valid: boolean;
};

const skip = new Set<string>([
  // Not supported
  "|draft2020-12|email.json",
  "|draft2019-09|email.json",
  "|draft7|email.json",
  "|draft6|email.json",
  "|draft4|email.json",

  // Not supported
  "|draft2020-12|hostname.json",
  "|draft2019-09|hostname.json",
  "|draft7|hostname.json",
  "|draft6|hostname.json",
  "|draft4|hostname.json",

  // Not supported
  "|draft2020-12|idn-email.json",
  "|draft2019-09|idn-email.json",
  "|draft7|idn-email.json",

  // Not supported
  "|draft2020-12|idn-hostname.json",
  "|draft2019-09|idn-hostname.json",
  "|draft7|idn-hostname.json",

  // Not supported
  "|draft2020-12|json-pointer.json",
  "|draft2019-09|json-pointer.json",
  "|draft7|json-pointer.json",
  "|draft6|json-pointer.json",

  // Not supported
  "|draft2020-12|relative-json-pointer.json",
  "|draft2019-09|relative-json-pointer.json",
  "|draft7|relative-json-pointer.json",

  // Leap seconds don't make sense without a date
  "|draft2020-12|time.json|validation of time strings|a valid time string with leap second, Zulu",
  "|draft2019-09|time.json|validation of time strings|a valid time string with leap second, Zulu",
  "|draft7|time.json|validation of time strings|a valid time string with leap second, Zulu",
  "|draft2020-12|time.json|validation of time strings|valid leap second, zero time-offset",
  "|draft2019-09|time.json|validation of time strings|valid leap second, zero time-offset",
  "|draft7|time.json|validation of time strings|valid leap second, zero time-offset",
  "|draft2020-12|time.json|validation of time strings|valid leap second, positive time-offset",
  "|draft2019-09|time.json|validation of time strings|valid leap second, positive time-offset",
  "|draft7|time.json|validation of time strings|valid leap second, positive time-offset",
  "|draft2020-12|time.json|validation of time strings|valid leap second, large positive time-offset",
  "|draft2019-09|time.json|validation of time strings|valid leap second, large positive time-offset",
  "|draft7|time.json|validation of time strings|valid leap second, large positive time-offset",
  "|draft2020-12|time.json|validation of time strings|valid leap second, negative time-offset",
  "|draft2019-09|time.json|validation of time strings|valid leap second, negative time-offset",
  "|draft7|time.json|validation of time strings|valid leap second, negative time-offset",
  "|draft2020-12|time.json|validation of time strings|valid leap second, large negative time-offset",
  "|draft2019-09|time.json|validation of time strings|valid leap second, large negative time-offset",
  "|draft7|time.json|validation of time strings|valid leap second, large negative time-offset"
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

setShouldValidateFormat(true);

const testSuitePath = "./node_modules/json-schema-test-suite";

const runTestSuite = (draft: string, dialectId: string) => {
  const testSuiteFilePath = `${testSuitePath}/tests/${draft}/optional/format`;

  describe(`${draft} ${dialectId}`, () => {
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

runTestSuite("draft2020-12", "https://json-schema.org/draft/2020-12/schema");
runTestSuite("draft2019-09", "https://json-schema.org/draft/2019-09/schema");
runTestSuite("draft7", "http://json-schema.org/draft-07/schema");
runTestSuite("draft6", "http://json-schema.org/draft-06/schema");
runTestSuite("draft4", "http://json-schema.org/draft-04/schema");
