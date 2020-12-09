const fs = require("fs");
const JsonSchema = require("./index");
const { expect } = require("chai");


const testSuitePath = "./node_modules/json-schema-test-suite";

const addRemotes = (schemaVersion, filePath = `${testSuitePath}/remotes`, url = "") => {
  return fs.readdirSync(filePath, { withFileTypes: true })
    .forEach((entry) => {
      if (entry.isFile()) {
        const remote = JSON.parse(fs.readFileSync(`${filePath}/${entry.name}`, "utf8"));
        JsonSchema.add(remote, `http://localhost:1234${url}/${entry.name}`, schemaVersion);
      } else if (entry.isDirectory()) {
        addRemotes(schemaVersion, `${filePath}/${entry.name}`, `${url}/${entry.name}`);
      }
    });
};

JsonSchema.setMetaOutputFormat(JsonSchema.FLAG);
//JsonSchema.setShouldMetaValidate(false);

const runTestSuite = (draft, schemaVersion) => {
  const testSuiteFilePath = `${testSuitePath}/tests/${draft}`;

  describe(`${draft} ${schemaVersion}`, () => {
    before(() => {
      addRemotes(schemaVersion);
    });

    fs.readdirSync(testSuiteFilePath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.json$/.test(entry.name))
      .forEach((entry) => {
        const file = `${testSuiteFilePath}/${entry.name}`;

        describe(entry.name, () => {
          const suites = JSON.parse(fs.readFileSync(file, "utf8"));

          suites.forEach((suite) => {
            describe(suite.description, () => {
              let validate;

              before(async () => {
                const path = "/" + suite.description.replace(/\s+/g, "-");
                const url = `http://${draft}-test-suite.json-schema.org${path}`;
                JsonSchema.add(suite.schema, url, schemaVersion);

                const schema = await JsonSchema.get(url);
                validate = await JsonSchema.validate(schema);
              });

              suite.tests.forEach((test) => {
                it(test.description, () => {
                  const output = validate(test.data);
                  expect(output.valid).to.equal(test.valid);
                });
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
runTestSuite("draft2019-09", "https://json-schema.org/draft/2020-12/schema");
