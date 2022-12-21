import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { addSchema, validate, setMetaOutputFormat, setUnstableKeywordEnabled, FLAG } from "./index.js";
import type { SchemaObject, Validator } from "./index.js";
import { expect } from "chai";


type Suite = {
  description: string;
  stability?: string;
  schema: SchemaObject;
  tests: Test[];
};

type Test = {
  description: string;
  data: unknown;
  valid: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tests are only skipped if I have good reason to decide not to fix them. This
// is usually because there has been some tradeoff I've made to not support
// something that doesn't come up in real schemas in favor of something that has
// value.
const skip: Set<string> = new Set([
  "anchor.json|$anchor inside an enum is not a real identifier",
  "id.json|$id inside an enum is not a real identifier"
]);

const shouldSkip = (path: string[]): boolean => {
  let index = 0;
  let key = path[index];
  do {
    if (skip.has(key)) {
      return true;
    }
    index += 1;
    key = `${key}|${path[index]}`;
  } while (index < path.length);

  return false;
};

const testSuitePath = `${__dirname}/json-schema-test-suite`;

const addRemotes = (filePath = `${testSuitePath}/remotes`, url = "") => {
  fs.readdirSync(filePath, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as SchemaObject;
        addSchema(remote, `http://localhost:1234${url}/${entry.name}`);
      } else if (entry.isDirectory()) {
        addRemotes(`${filePath}/${entry.name}`, `${url}/${entry.name}`);
      }
    });
};

setMetaOutputFormat(FLAG);
//JsonSchema.setShouldMetaValidate(false);

setUnstableKeywordEnabled("https://json-schema.org/keyword/dynamicRef", true);
setUnstableKeywordEnabled("https://json-schema.org/keyword/propertyDependencies", true);
setUnstableKeywordEnabled("https://json-schema.org/keyword/requireAllExcept", true);

const runTestSuite = (dialectId?: string) => {
  describe(`JSON Schema Test Suite: ${dialectId || "default"}`, () => {
    fs.readdirSync(`${testSuitePath}/tests`, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${testSuitePath}/tests/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let _validate: Validator;
              const skipPath = [entry.name, suite.description];

              before(async () => {
                if (shouldSkip(skipPath)) {
                  return;
                }
                const path = "/" + suite.description.replace(/\s+/g, "-");
                const url = `http://test-suite.json-schema.org${path}`;
                addSchema(suite.schema, url, dialectId);

                _validate = await validate(url);
              });

              suite.tests.forEach((test) => {
                skipPath.push(test.description);
                if (shouldSkip(skipPath)) {
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

addRemotes();
runTestSuite();
