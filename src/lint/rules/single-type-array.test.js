import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import singleTypeArray from "./single-type-array.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("single-type-array", () => {
  test("an array of one type", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": ["string"] }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'type' has only one type, so it can be "string" instead of an array`
    ]);
    expect(file.messages[0].ruleId).to.equal("single-type-array");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 70, offset: 69 },
      end: { line: 1, column: 80, offset: 79 }
    });
  });

  test("a single type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "string" }`)).to.eql([]);
  });

  test("more than one type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": ["string", "null"] }`)).to.eql([]);
  });

  test("an empty array", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": [] }`)).to.eql([]);
  });

  test("in draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "type": ["integer"] }`)).to.eql([
      `'type' has only one type, so it can be "integer" instead of an array`
    ]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "type": ["object"] } }`)).to.eql([
      `'type' has only one type, so it can be "object" instead of an array`
    ]);
  });

  test("a property named type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "type": { "enum": ["a"] } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(singleTypeArray)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
