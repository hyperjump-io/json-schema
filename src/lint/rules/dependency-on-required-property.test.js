import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import dependencyOnRequiredProperty from "./dependency-on-required-property.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const draft07 = "http://json-schema.org/draft-07/schema#";

const message = "'meta' is required, so this dependency always applies";

describe("dependency-on-required-property", () => {
  test("dependentRequired", async () => {
    const json = `{ "$schema": "${draft2020}", "required": ["meta"], "dependentRequired": { "meta": ["data"] } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message]);
    expect(file.messages[0].ruleId).to.equal("dependency-on-required-property");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const entry = `"meta": ["data"]`;
    const offset = json.indexOf(entry);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + entry.length + 1, offset: offset + entry.length }
    });
  });

  test("only dependencies on required properties", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "dependentRequired": { "data": ["meta"], "meta": ["data"] },
      "required": ["meta"]
    }`)).to.eql([message]);
  });

  test("dependentSchemas", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["meta"], "dependentSchemas": { "meta": { "required": ["data"] } } }`)).to.eql([message]);
  });

  test("without required", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "dependentRequired": { "meta": ["data"] } }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "required": ["meta"], "dependentRequired": { "meta": ["data"] } } }`)).to.eql([message]);
  });

  test("a property named dependentRequired", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["meta"], "properties": { "dependentRequired": { "properties": { "meta": true } } } }`)).to.eql([]);
  });

  test("draft-07 dependencies, with an array or a schema", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "required": ["meta"], "dependencies": { "meta": ["data"] } }`)).to.eql([message]);
    expect(await reasons(`{ "$schema": "${draft07}", "required": ["meta"], "dependencies": { "meta": { "required": ["data"] } } }`)).to.eql([message]);
  });

  test("draft-04 dependencies", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "required": ["meta"], "dependencies": { "meta": ["data"] } }`)).to.eql([message]);
  });

  test("required in an allOf", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "required": ["meta"] }], "dependentRequired": { "meta": ["data"] } }`)).to.eql([message]);
  });

  test("required through a reference", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "$ref": "#/$defs/meta",
      "dependentRequired": { "meta": ["data"] },
      "$defs": { "meta": { "required": ["meta"] } }
    }`)).to.eql([message]);
  });

  test("required in only one branch of an anyOf", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "required": ["meta"] }, {}], "dependentRequired": { "meta": ["data"] } }`)).to.eql([]);
  });

  test("an if that only requires required properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a", "b"], "if": { "required": ["a", "b"] }, "then": { "required": ["c"] } }`)).to.eql([
      "'a' and 'b' are required, so the 'if' schema always passes"
    ]);
  });

  test("an if that requires a property that isn't required", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "if": { "required": ["a", "b"] }, "then": { "required": ["c"] } }`)).to.eql([]);
  });

  test("an if that asserts more than required properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "if": { "required": ["a"], "minProperties": 2 }, "then": { "required": ["c"] } }`)).to.eql([]);
  });

  test("an empty if", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["a"], "if": {}, "then": { "required": ["c"] } }`)).to.eql([]);
  });

  test("dependencies isn't a keyword after draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "required": ["meta"], "dependencies": { "meta": ["data"] } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(dependencyOnRequiredProperty)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
