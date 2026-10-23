import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import constOrEnumValueRejected from "./const-or-enum-value-rejected.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(constOrEnumValueRejected)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("const-or-enum-value-rejected", () => {
  test("an enum value an assertion rejects", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "enum": [10, 5], "multipleOf": 2 }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'multipleOf' rejects this value, so it's never valid"
    ]);
    expect(file.messages[0].ruleId).to.equal("const-or-enum-value-rejected");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 75, offset: 74 },
      end: { line: 1, column: 76, offset: 75 }
    });
  });

  test("a const value", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "const": "a", "minLength": 2 }`)).to.eql([
      "'minLength' rejects the 'const' value, so nothing is valid"
    ]);
  });

  test("more than one assertion", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["a"], "minLength": 2, "maxLength": 0, "pattern": "^b" }`)).to.eql([
      "'minLength', 'maxLength' and 'pattern' reject this value, so it's never valid"
    ]);
  });

  test("values every assertion allows", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["one", "two"], "minLength": 3 }`)).to.eql([]);
  });

  test("objects", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [{ "a": 1 }, { "b": 1 }], "required": ["a"] }`)).to.eql([
      "'required' rejects this value, so it's never valid"
    ]);
  });

  test("dependentRequired", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "const": { "a": 1 }, "dependentRequired": { "a": ["b"] } }`)).to.eql([
      "'dependentRequired' rejects the 'const' value, so nothing is valid"
    ]);
  });

  test("a draft-04 exclusive limit", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "enum": [4, 5], "maximum": 5, "exclusiveMaximum": true }`)).to.eql([
      "'maximum' rejects this value, so it's never valid"
    ]);
  });

  test("type isn't checked", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [1], "type": "string" }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "enum": [-1, 1], "minimum": 0 } }`)).to.eql([
      "'minimum' rejects this value, so it's never valid"
    ]);
  });
});
