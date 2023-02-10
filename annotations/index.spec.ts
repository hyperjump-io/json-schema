import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";

import * as AnnotatedInstance from "./annotated-instance.js";
import { annotate } from "./index.js";
import { addSchema } from "../lib/core.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";

import type { SchemaObject } from "../lib/schema.js";
import type { AnnotatedJsonDocument } from "./annotated-instance.js";
import type { Annotator } from "./index.js";


type Suite = {
  title: string;
  schema: SchemaObject;
  subjects: Subject[];
};

type Subject = {
  instance: unknown;
  assertions: Assertion[];
};

type Assertion = {
  location: string;
  keyword: string;
  expected: unknown[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = "https://annotations.json-schema.hyperjump.io";

const testSuiteFilePath = `${__dirname}/tests`;

fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .forEach((entry) => {
    const file = `${testSuiteFilePath}/${entry.name}`;
    const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

    suites.forEach((suite) => {
      describe(suite.title + "\n" + JSON.stringify(suite.schema, null, "  "), () => {
        let annotator: Annotator;

        beforeEach(async () => {
          const id = `${host}/${encodeURIComponent(suite.title)}`;
          addSchema(suite.schema, id);

          annotator = await annotate(id);
        });

        suite.subjects.forEach((subject) => {
          describe("Instance: " + JSON.stringify(subject.instance), () => {
            let instance: AnnotatedJsonDocument;

            beforeEach(() => {
              instance = annotator(subject.instance);
            });

            subject.assertions.forEach((assertion) => {
              it(`${assertion.keyword} annotations at '${assertion.location}' should be ${JSON.stringify(assertion.expected)}`, () => {
                const dialect: string = suite.schema.$schema as string;
                const annotations = AnnotatedInstance.annotation(AnnotatedInstance.get(assertion.location, instance), assertion.keyword, dialect);
                expect(annotations).to.eql(assertion.expected);
              });
            });
          });
        });
      });
    });
  });
