import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import multipleOfOne from "./multiple-of-one.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(multipleOfOne)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const useInteger = "'multipleOf': 1 only allows integers. Remove it, and replace 'number' with 'integer' in 'type'.";
const removeNumber = "'multipleOf': 1 only allows integers. Remove it, and 'number' from 'type', which also allows 'integer'.";
const noEffect = "'multipleOf': 1 has no effect, because 'type' only allows integers";

describe("multiple-of-one", () => {
  test("with type number", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "number", "multipleOf": 1 }`);
    expect(file.messages.map((message) => message.reason)).to.eql([useInteger]);
    expect(file.messages[0].ruleId).to.equal("multiple-of-one");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 80, offset: 79 },
      end: { line: 1, column: 95, offset: 94 }
    });
  });

  test("with type integer", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "integer", "multipleOf": 1 }`)).to.eql([noEffect]);
  });

  test("with number and integer", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["number", "integer"], "multipleOf": 1 }`)).to.eql([removeNumber]);
  });

  test("with number and other types", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["number", "string"], "multipleOf": 1 }`)).to.eql([useInteger]);
  });

  test("written as 1.0", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "integer", "multipleOf": 1.0 }`)).to.eql([noEffect]);
  });

  test("without type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "multipleOf": 1 }`)).to.eql([]);
  });

  test("with a type that doesn't allow numbers", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "string", "multipleOf": 1 }`)).to.eql([]);
  });

  test("other values", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "number", "multipleOf": 2 }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "number", "multipleOf": 0.5 }`)).to.eql([]);
  });

  test("in draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "type": "number", "multipleOf": 1 }`)).to.eql([useInteger]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "type": "integer", "multipleOf": 1 } }`)).to.eql([noEffect]);
  });

  test("a property named multipleOf", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "object", "properties": { "multipleOf": { "const": 1 } } }`)).to.eql([]);
  });
});
