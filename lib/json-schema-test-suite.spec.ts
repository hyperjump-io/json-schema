import fs from "fs";
import JsonSchema from "./index";
import type { SchemaObject, Dialect, Validator } from "@hyperjump/json-schema-core";
import { expect } from "chai";


type Suite = {
  description: string;
  schema: SchemaObject;
  tests: Test[];
};

type Test = {
  description: string;
  data: unknown;
  valid: boolean;
};

// Tests are only skipped if I have good reason to decide not to fix them. This
// is usually because there has been some tradeoff I've made to not support
// something that doesn't come up in real schemas in favor of something that has
// value.
const skip: Set<string> = new Set([
  // I don't think the test suite reflects the original intent for how the
  // length of strings should be determined and I chose to go a different
  // direction for draft-04.
  "|draft4|maxLength.json|maxLength validation|two supplementary Unicode code points is long enough",
  "|draft4|minLength.json|minLength validation|one supplementary Unicode code point is not long enough",

  // Skip tests for pointers that cross schema resource boundaries. There might
  // be a way to solve this, but because this functionality has been removed
  // from the spec and there is no good reason to do this, it will probably not
  // ever be fixed.
  "|draft4|refRemote.json|base URI change - change folder in subschema",
  "|draft6|refRemote.json|base URI change - change folder in subschema",
  "|draft7|refRemote.json|base URI change - change folder in subschema",

  // Skip tests that ignore keywords in places that are not schemas such as a
  // $ref in a const. Because this implementation is dialect agnostic, there's
  // no way to know whether a location is a schema or not. Especially since this
  // isn't a real problem that comes up with real schemas, I'm not concerned
  // about making it work.
  "|draft4|id.json|id inside an enum is not a real identifier",
  "|draft4|ref.json|naive replacement of $ref with its destination is not correct",
  "|draft6|id.json|id inside an enum is not a real identifier",
  "|draft6|unknownKeyword.json|$id inside an unknown keyword is not a real identifier",
  "|draft6|ref.json|naive replacement of $ref with its destination is not correct",
  "|draft7|id.json|id inside an enum is not a real identifier",
  "|draft7|unknownKeyword.json|$id inside an unknown keyword is not a real identifier",
  "|draft7|ref.json|naive replacement of $ref with its destination is not correct",
  "|draft2019-09|anchor.json|$anchor inside an enum is not a real identifier",
  "|draft2019-09|id.json|$id inside an enum is not a real identifier",
  "|draft2019-09|unknownKeyword.json|$id inside an unknown keyword is not a real identifier",
  "|draft2020-12|anchor.json|$anchor inside an enum is not a real identifier",
  "|draft2020-12|id.json|$id inside an enum is not a real identifier",
  "|draft2020-12|unknownKeyword.json|$id inside an unknown keyword is not a real identifier"
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

const addRemotes = (schemaVersion: Dialect, filePath = `${testSuitePath}/remotes`, url = "") => {
  fs.readdirSync(filePath, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.isFile()) {
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8")) as SchemaObject;
        JsonSchema.add(remote, `http://localhost:1234${url}/${entry.name}`, schemaVersion);
      } else if (entry.isDirectory()) {
        addRemotes(schemaVersion, `${filePath}/${entry.name}`, `${url}/${entry.name}`);
      }
    });
};

JsonSchema.setMetaOutputFormat(JsonSchema.FLAG);
//JsonSchema.setShouldMetaValidate(false);

const runTestSuite = (draft: string, schemaVersion: Dialect) => {
  const testSuiteFilePath = `${testSuitePath}/tests/${draft}`;

  describe(`${draft} ${schemaVersion}`, () => {
    before(() => {
      addRemotes(schemaVersion);
    });

    fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .forEach((entry) => {
        const file = `${testSuiteFilePath}/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8")) as Suite[];

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let validate: Validator;

              before(async () => {
                if (shouldSkip([draft, entry.name, suite.description])) {
                  return;
                }
                const path = "/" + suite.description.replace(/\s+/g, "-");
                const url = `http://${draft}-test-suite.json-schema.org${path}`;
                JsonSchema.add(suite.schema, url, schemaVersion);

                const schema = await JsonSchema.get(url);
                validate = await JsonSchema.validate(schema);
              });

              suite.tests.forEach((test) => {
                if (shouldSkip([draft, entry.name, suite.description, test.description])) {
                  it.skip(test.description, () => { /* empty */ });
                } else {
                  it(test.description, () => {
                    const output = validate(test.data);
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

runTestSuite("draft4", "http://json-schema.org/draft-04/schema");
runTestSuite("draft6", "http://json-schema.org/draft-06/schema");
runTestSuite("draft7", "http://json-schema.org/draft-07/schema");
runTestSuite("draft2019-09", "https://json-schema.org/draft/2019-09/schema");
runTestSuite("draft2020-12", "https://json-schema.org/draft/2020-12/schema");
