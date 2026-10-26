import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import singleValueEnum from "./single-value-enum.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft06 = "http://json-schema.org/draft-06/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

const useConst = "'enum' has only one value. Use 'const' instead.";

describe("single-value-enum", () => {
  test("one value", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "enum": ["foo"] }`);
    expect(file.messages.map((message) => message.reason)).to.eql([useConst]);
    expect(file.messages[0].ruleId).to.equal("single-value-enum");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 77, offset: 76 }
    });
  });

  test("one value that's an object", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [{ "a": 1 }] }`)).to.eql([useConst]);
  });

  test("more than one value", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["foo", "bar"] }`)).to.eql([]);
  });

  test("no values", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [] }`)).to.eql([]);
  });

  test("next to const", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "const": "foo", "enum": ["foo"] }`)).to.eql([]);
  });

  test("in draft-06", async () => {
    expect(await reasons(`{ "$schema": "${draft06}", "enum": [42] }`)).to.eql([useConst]);
  });

  test("draft-04 doesn't have const", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "enum": [42] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "enum": [null] } } }`)).to.eql([useConst]);
  });

  test("a property named enum", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "enum": { "type": "string" } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(singleValueEnum)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
