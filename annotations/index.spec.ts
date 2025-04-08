import fs from "node:fs";
import { describe, test, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { isCompatible } from "./test-utils.js";
import { toAbsoluteIri } from "@hyperjump/uri";
import { annotate } from "./index.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import * as Instance from "./annotated-instance.js";

import type { SchemaObject } from "../lib/index.js";
import type { Annotator } from "./index.js";
import type { JsonNode } from "../lib/instance.js";
import type { Json } from "@hyperjump/json-pointer";


type Suite = {
  description: string;
  suite: TestCase[];
};

type TestCase = {
  description: string;
  compatibility: string;
  schema: SchemaObject;
  tests: Test[];
};

type Test = {
  instance: Json;
  assertions: Assertion[];
};

type Assertion = {
  location: string;
  keyword: string;
  expected: unknown[];
};

const host = "https://annotations.json-schema.hyperjump.io";

const testSuiteFilePath = "./node_modules/json-schema-test-suite/annotations/tests";

const testRunner = (version: number, dialect: string) => {
  describe(dialect, () => {
    fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${testSuiteFilePath}/${entry.name}`;
        const suite = JSON.parse(fs.readFileSync(file, "utf8")) as Suite;

        for (const testCase of suite.suite) {
          if (!isCompatible(testCase.compatibility, version)) {
            continue;
          }

          describe(testCase.description + "\n" + JSON.stringify(testCase.schema, null, "  "), () => {
            let annotator: Annotator;
            let id: string;

            beforeAll(async () => {
              id = `${host}/${encodeURIComponent(testCase.description)}`;
              registerSchema(testCase.schema, id, dialect);

              annotator = await annotate(id);
            });

            afterAll(() => {
              unregisterSchema(id);
            });

            for (const subject of testCase.tests) {
              describe("Instance: " + JSON.stringify(subject.instance), () => {
                let instance: JsonNode;

                beforeEach(() => {
                  // TODO: What's wrong with the type?
                  instance = annotator(subject.instance); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
                });

                for (const assertion of subject.assertions) {
                  test(`${assertion.keyword} annotations at '${assertion.location}' should be ${JSON.stringify(assertion.expected)}`, () => {
                    const dialect: string | undefined = testCase.schema.$schema ? toAbsoluteIri(testCase.schema.$schema as string) : undefined;
                    const subject = Instance.get(`#${assertion.location}`, instance);
                    const annotations = subject ? Instance.annotation(subject, assertion.keyword, dialect) : [];
                    expect(annotations).to.eql(Object.values(assertion.expected));
                  });
                }
              });
            }
          });
        }
      });
  });
};

describe("annotations", () => {
  testRunner(9999, "https://json-schema.org/validation");
  testRunner(2020, "https://json-schema.org/draft/2020-12/schema");
  testRunner(2019, "https://json-schema.org/draft/2019-09/schema");
  testRunner(7, "http://json-schema.org/draft-07/schema");
  testRunner(6, "http://json-schema.org/draft-06/schema");
  testRunner(4, "http://json-schema.org/draft-04/schema");
});
