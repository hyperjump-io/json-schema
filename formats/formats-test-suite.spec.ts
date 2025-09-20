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
  "|draft2020-12|date-time.json",
  "|draft2019-09|date-time.json",
  "|draft7|date-time.json",
  "|draft6|date-time.json",
  "|draft4|date-time.json",

  // Not supported
  "|draft2020-12|date.json",
  "|draft2019-09|date.json",
  "|draft7|date.json",

  // Not supported
  "|draft2020-12|duration.json",
  "|draft2019-09|duration.json",

  // Not supported
  "|draft2020-12|ecmascript-regex.json",
  "|draft2019-09|ecmascript-regex.json",
  "|draft7|ecmascript-regex.json",

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
  "|draft2020-12|ipv4.json",
  "|draft2019-09|ipv4.json",
  "|draft7|ipv4.json",
  "|draft6|ipv4.json",
  "|draft4|ipv4.json",

  // Not supported
  "|draft2020-12|ipv6.json",
  "|draft2019-09|ipv6.json",
  "|draft7|ipv6.json",
  "|draft6|ipv6.json",
  "|draft4|ipv6.json",

  // Not supported
  "|draft2020-12|iri-reference.json",
  "|draft2019-09|iri-reference.json",
  "|draft7|iri-reference.json",

  // Not supported
  "|draft2020-12|iri.json",
  "|draft2019-09|iri.json",
  "|draft7|iri.json",

  // Not supported
  "|draft2020-12|json-pointer.json",
  "|draft2019-09|json-pointer.json",
  "|draft7|json-pointer.json",
  "|draft6|json-pointer.json",

  // Not supported
  "|draft2020-12|regex.json",
  "|draft2019-09|regex.json",
  "|draft7|regex.json",

  // Not supported
  "|draft2020-12|relative-json-pointer.json",
  "|draft2019-09|relative-json-pointer.json",
  "|draft7|relative-json-pointer.json",

  // Not supported
  "|draft2020-12|time.json",
  "|draft2019-09|time.json",
  "|draft7|time.json",

  // Not supported
  "|draft2020-12|uri-reference.json",
  "|draft2019-09|uri-reference.json",
  "|draft7|uri-reference.json",
  "|draft6|uri-reference.json",

  // Not supported
  "|draft2020-12|uri-template.json",
  "|draft2019-09|uri-template.json",
  "|draft7|uri-template.json",
  "|draft6|uri-template.json",

  // Not supported
  "|draft2020-12|uri.json",
  "|draft2019-09|uri.json",
  "|draft7|uri.json",
  "|draft6|uri.json",
  "|draft4|uri.json",

  // Not supported
  "|draft2020-12|uuid.json",
  "|draft2019-09|uuid.json"
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
