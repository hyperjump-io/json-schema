import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import keywordAllowsNothing from "./keyword-allows-nothing.js";

const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("keyword-allows-nothing", () => {
  test("an empty enum", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'enum' is empty, so nothing is valid against it"]);
    expect(file.messages[0].ruleId).to.equal("keyword-allows-nothing");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 44, offset: 43 },
      end: { line: 1, column: 54, offset: 53 }
    });
  });

  test("an enum with values", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [null] }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "enum": [] } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named enum isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "enum": {} } }`);
    expect(file.messages).to.eql([]);
  });

  test("an empty enum is a schema problem in draft-04, not lint", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema#", "enum": [] }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/draft-04/enum"]);
  });

  test("an empty type", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": [] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'type' is empty, so nothing is valid against it"]);
  });

  test("a type with types", async () => {
    expect((await lint(`{ "$schema": "${draft202012}", "type": ["string"] }`)).messages).to.eql([]);
    expect((await lint(`{ "$schema": "${draft202012}", "type": "string" }`)).messages).to.eql([]);
  });

  test("an empty type in draft-04", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": [] }`);
    expect(file.messages).to.have.length(1);
  });

  test("an empty type is a schema problem in v1, not lint", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "type": [] }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/type"]);
  });

  test("allOf with a schema that allows nothing", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "allOf": [{ "type": "string" }, false] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'allOf' allows nothing, so nothing is valid against it"]);
    expect((await lint(`{ "$schema": "${draft202012}", "allOf": [{ "type": "string", "const": 1 }] }`)).messages).to.have.length(1);
  });

  test("anyOf allows nothing only if every schema in it does", async () => {
    expect((await lint(`{ "$schema": "${draft202012}", "anyOf": [false, { "type": [] }] }`)).messages.map((message) => message.reason)).to.eql([
      "'anyOf' allows nothing, so nothing is valid against it",
      "'type' is empty, so nothing is valid against it"
    ]);
    expect((await lint(`{ "$schema": "${draft202012}", "anyOf": [false, { "type": "string" }] }`)).messages).to.eql([]);
  });

  test("a reference to a schema that allows nothing isn't reported", async () => {
    expect((await lint(`{ "$schema": "${draft202012}", "$ref": "#/$defs/never", "$defs": { "never": false } }`)).messages).to.eql([]);
    expect((await lint(`{ "$schema": "${draft202012}", "allOf": [{ "$ref": "#/$defs/never" }], "$defs": { "never": false } }`)).messages).to.eql([]);
  });

  test("keywords that allow nothing for properties or items aren't reported", async () => {
    expect((await lint(`{ "$schema": "${draft202012}", "items": false, "additionalProperties": false, "not": {} }`)).messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordAllowsNothing)
    .process(file);
  return file;
};
