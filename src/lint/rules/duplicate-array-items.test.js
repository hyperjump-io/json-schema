import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import duplicateArrayItems from "./duplicate-array-items.js";

const v1 = "https://json-schema.org/v1";
const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("duplicate-array-items", () => {
  test("a duplicate in required", async () => {
    const json = `{ "$schema": "${draft202012}", "required": ["a", "b", "a"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'a' is already in 'required'"]);
    expect(file.messages[0].ruleId).to.equal("duplicate-array-items");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.lastIndexOf(`"a"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 4, offset: offset + 3 }
    });
  });

  test("every duplicate is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "required": ["a", "a", "a"] }`)).to.have.length(2);
  });

  test("type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["string", "null", "string"] }`)).to.eql(["'string' is already in 'type'"]);
    expect(await reasons(`{ "$schema": "${v1}", "type": ["null", "null"] }`)).to.eql(["'null' is already in 'type'"]);
  });

  test("a duplicate in a dependency", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "dependentRequired": { "a": ["b", "b"], "c": ["b"] } }`)).to.eql([
      "'b' is already in 'dependentRequired' for 'a'"
    ]);
  });

  test("dependencies", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "dependencies": { "a": ["b", "b"], "c": { "required": ["b"] } } }`)).to.eql([
      "'b' is already in 'dependencies' for 'a'"
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "dependencies": { "a": ["b", "b"] } }`)).to.have.length(1);
  });

  test("draft-04's required and enum", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "required": ["x", "x"], "enum": [1, { "x": [1], "y": 2 }, 1.0, { "y": 2, "x": [1] }, "1"] }`)).to.eql([
      "'x' is already in 'required'",
      "This value is already in 'enum'",
      "This value is already in 'enum'"
    ]);
  });

  test("enum after draft-04 is duplicate-enum-values'", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "enum": [1, 1] }`)).to.eql([]);
  });

  test("items that aren't equal", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "required": ["a", "A", "b"], "type": ["string", "number"] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "required": ["a", "a"] } } }`)).to.have.length(1);
  });

  test("a property named required isn't a keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "required": { "enum": ["a", "a"] } } }`)).to.eql([]);
  });

  test("a dialect without dependentRequired", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "dependentRequired": { "a": ["b", "b"] } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(duplicateArrayItems)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
