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
  // Uses UTS #46 rather than RFC 589[0-5]
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|contains illegal char U+302E Hangul single dot tone mark",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|contains illegal char U+302E Hangul single dot tone mark",
  "|draft7|idn-hostname.json|validation of internationalized host names|contains illegal char U+302E Hangul single dot tone mark",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, right-to-left chars",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, right-to-left chars",
  "|draft7|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, right-to-left chars",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, left-to-right chars",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, left-to-right chars",
  "|draft7|idn-hostname.json|validation of internationalized host names|Exceptions that are DISALLOWED, left-to-right chars",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no preceding 'l'",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no preceding 'l'",
  "|draft7|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no preceding 'l'",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing preceding",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing preceding",
  "|draft7|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing preceding",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no following 'l'",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no following 'l'",
  "|draft7|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with no following 'l'",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing following",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing following",
  "|draft7|idn-hostname.json|validation of internationalized host names|MIDDLE DOT with nothing following",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by Greek",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by Greek",
  "|draft7|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by Greek",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by anything",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by anything",
  "|draft7|idn-hostname.json|validation of internationalized host names|Greek KERAIA not followed by anything",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Hebrew GERESH not preceded by anything",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Hebrew GERESH not preceded by anything",
  "|draft7|idn-hostname.json|validation of internationalized host names|Hebrew GERESH not preceded by anything",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|Hebrew GERSHAYIM not preceded by anything",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|Hebrew GERSHAYIM not preceded by anything",
  "|draft7|idn-hostname.json|validation of internationalized host names|Hebrew GERSHAYIM not preceded by anything",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no Hiragana, Katakana, or Han",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no Hiragana, Katakana, or Han",
  "|draft7|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no Hiragana, Katakana, or Han",
  "|draft2020-12|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no other characters",
  "|draft2019-09|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no other characters",
  "|draft7|idn-hostname.json|validation of internationalized host names|KATAKANA MIDDLE DOT with no other characters",

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
