import { readFile } from "node:fs/promises";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isCompatible, md5, loadSchemas, unloadSchemas, testSuite } from "./test-utils.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import {
  annotationsPlugin,
  compile,
  detailedOutputPlugin,
  getKeywordName,
  getSchema,
  Validation
} from "../lib/experimental.js";
import * as Instance from "../lib/instance.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";
import { bundle, URI, UUID } from "./index.js";

import type { BundleOptions } from "./index.js";
import type { OutputUnit } from "../lib/index.js";
import type { AnnotationsContext, ErrorsContext, ValidationContext } from "../lib/experimental.js";


const suite = testSuite("./bundle/tests");

const config: BundleOptions[] = [
  { definitionNamingStrategy: URI },
  { definitionNamingStrategy: UUID }
];

const testRunner = (version: number, dialect: string) => {
  const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
  describe(dialect, () => {
    for (const testCase of suite) {
      if (!isCompatible(testCase.compatibility, version)) {
        continue;
      }

      describe(testCase.description, () => {
        const mainSchemaUri = "https://bundler.hyperjump.io/main";

        for (const options of config) {
          describe(JSON.stringify(options), () => {
            beforeAll(async () => {
              loadSchemas(testCase, mainSchemaUri, dialect);

              const bundledSchema = await bundle(mainSchemaUri, options);
              bundledSchema[definitionsToken] ??= {};

              unloadSchemas(testCase, mainSchemaUri, dialect);

              registerSchema(bundledSchema, mainSchemaUri, dialect);
            });

            afterAll(() => {
              unloadSchemas(testCase, mainSchemaUri, dialect);
              unregisterSchema(mainSchemaUri);
            });

            testCase.tests.forEach((test, testIndex) => {
              it(test.description, async () => {
                const schema = await getSchema(mainSchemaUri);
                const { ast, schemaUri } = await compile(schema);

                const instance = Instance.fromJs(test.instance);
                const context = {
                  ast,
                  plugins: [detailedOutputPlugin, annotationsPlugin, ...ast.plugins]
                } as ValidationContext & ErrorsContext & AnnotationsContext;
                const valid = Validation.interpret(schemaUri, instance, context);

                const output = {
                  valid,
                  errors: context.errors,
                  annotations: context.annotations
                };

                const testId = md5(`${version}|${dialect}|${testCase.description}|${testIndex}`);
                const expectedOutputJson = await readFile(`./bundle/snapshots/${testId}`, "utf-8");
                const expectedOutput = JSON.parse(expectedOutputJson) as OutputUnit;
                expect(output).to.eql(expectedOutput);
              });
            });
          });
        }
      });
    }
  });
};

describe("bundle", () => {
  testRunner(9999, "https://json-schema.org/validation");
  testRunner(2020, "https://json-schema.org/draft/2020-12/schema");
  testRunner(2019, "https://json-schema.org/draft/2019-09/schema");
  testRunner(7, "http://json-schema.org/draft-07/schema");
  testRunner(6, "http://json-schema.org/draft-06/schema");
  testRunner(4, "http://json-schema.org/draft-04/schema");
});
