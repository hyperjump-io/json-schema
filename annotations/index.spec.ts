import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { toAbsoluteIri } from "@hyperjump/uri";
import { annotate } from "./index.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import * as Instance from "./annotated-instance.js";

import type { SchemaObject } from "../lib/index.js";
import type { Annotator } from "./index.js";
import type { JsonNode } from "../lib/instance.js";
import type { Json } from "@hyperjump/json-pointer";


type Suite = {
  title: string;
  schema: SchemaObject;
  subjects: Subject[];
};

type Subject = {
  instance: Json;
  assertions: Assertion[];
};

type Assertion = {
  location: string;
  keyword: string;
  expected: unknown[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dialectId = "https://json-schema.org/validation";
const host = "https://annotations.json-schema.hyperjump.io";

const testSuiteFilePath = `${__dirname}/tests`;

describe("Annotations", () => {
  fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .forEach((entry) => {
      const file = `${testSuiteFilePath}/${entry.name}`;
      const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

      suites.forEach((suite) => {
        describe(suite.title + "\n" + JSON.stringify(suite.schema, null, "  "), () => {
          let annotator: Annotator;
          let id: string;

          beforeAll(async () => {
            id = `${host}/${encodeURIComponent(suite.title)}`;
            registerSchema(suite.schema, id, dialectId);

            annotator = await annotate(id);
          });

          afterAll(() => {
            unregisterSchema(id);
          });

          suite.subjects.forEach((subject) => {
            describe("Instance: " + JSON.stringify(subject.instance), () => {
              let instance: JsonNode;

              beforeEach(() => {
                // TODO: What's wrong with the type?
                instance = annotator(subject.instance); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
              });

              subject.assertions.forEach((assertion) => {
                it(`${assertion.keyword} annotations at '${assertion.location}' should be ${JSON.stringify(assertion.expected)}`, () => {
                  const dialect: string | undefined = suite.schema.$schema ? toAbsoluteIri(suite.schema.$schema as string) : undefined;
                  const subject = Instance.get(assertion.location, instance);
                  const annotations = subject ? Instance.annotation(subject, assertion.keyword, dialect) : [];
                  expect(annotations).to.eql(assertion.expected);
                });
              });
            });
          });
        });
      });
    });
});
