import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import singleValueRange from "./single-value-range.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

const useConst = "'minimum' and 'maximum' are both 5, so it's the only valid value. Use 'const': 5 instead.";

describe("single-value-range", () => {
  test("equal limits", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "number", "minimum": 5, "maximum": 5 }`);
    expect(file.messages.map((message) => message.reason)).to.eql([useConst]);
    expect(file.messages[0].ruleId).to.equal("single-value-range");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 94, offset: 93 },
      end: { line: 1, column: 106, offset: 105 }
    });
  });

  test("maximum first", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "integer", "maximum": 5, "minimum": 5 }`);
    expect(file.messages.map((message) => message.reason)).to.eql([useConst]);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 95, offset: 94 },
      end: { line: 1, column: 107, offset: 106 }
    });
  });

  test("written differently", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "number", "minimum": 5, "maximum": 5.0 }`)).to.eql([useConst]);
  });

  test("different limits", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "number", "minimum": 5, "maximum": 6 }`)).to.eql([]);
  });

  test("an exclusive limit", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "number", "minimum": 5, "exclusiveMaximum": 5 }`)).to.eql([]);
  });

  test("without type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "minimum": 5, "maximum": 5 }`)).to.eql([]);
  });

  test("with a type that allows other types", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["number", "string"], "minimum": 5, "maximum": 5 }`)).to.eql([]);
  });

  test("with number and integer", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["number", "integer"], "minimum": 5, "maximum": 5 }`)).to.eql([useConst]);
  });

  test("draft-04 uses enum", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "type": "number", "minimum": 5, "maximum": 5 }`)).to.eql([
      "'minimum' and 'maximum' are both 5, so it's the only valid value. Use 'enum': [5] instead."
    ]);
  });

  test("draft-04 with an exclusive limit", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "type": "number", "minimum": 5, "maximum": 5, "exclusiveMaximum": true }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft04}", "type": "number", "minimum": 5, "maximum": 5, "exclusiveMaximum": false }`)).to.have.length(1);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "type": "number", "minimum": 5, "maximum": 5 } }`)).to.eql([useConst]);
  });

  test("properties named like the limits", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "type": "object",
      "properties": { "minimum": { "const": 5 }, "maximum": { "const": 5 } }
    }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(singleValueRange)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
