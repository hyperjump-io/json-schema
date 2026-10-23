import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import misnamedDefinitions from "./misnamed-definitions.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(misnamedDefinitions)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages
  .filter((message) => message.ruleId === "misnamed-definitions")
  .map((message) => message.reason);

const useDefs = "'definitions' isn't a keyword in this dialect, so what's in it isn't a schema, and references to it don't find one. Use '$defs'.";
const useDefinitions = "'$defs' isn't a keyword in this dialect, so what's in it isn't a schema, and references to it don't find one. Use 'definitions'.";

describe("misnamed-definitions", () => {
  test("definitions in 2020-12", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "definitions": { "foo": { "type": "string" } } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([useDefs]);
    expect(file.messages[0].ruleId).to.equal("misnamed-definitions");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 108, offset: 107 }
    });
  });

  test("definitions in 2019-09", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "definitions": {} }`)).to.eql([useDefs]);
  });

  test("$defs in 2020-12", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$defs": { "foo": { "type": "string" } } }`)).to.eql([]);
  });

  test("$defs in draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "$defs": { "foo": { "type": "string" } } }`)).to.eql([useDefinitions]);
  });

  test("$defs in draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "$defs": {} }`)).to.eql([useDefinitions]);
  });

  test("definitions in draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "definitions": { "foo": { "type": "string" } } }`)).to.eql([]);
  });

  test("with a reference to it", async () => {
    const file = await lint(`{
      "$schema": "${draft202012}",
      "$ref": "#/definitions/foo",
      "definitions": { "foo": { "type": "string" } }
    }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["misnamed-definitions"]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "definitions": {} } }`)).to.eql([useDefs]);
  });

  test("in an embedded resource in another dialect", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$defs": {
        "foo": { "$schema": "${draft07}", "$id": "https://example.com/foo", "definitions": {}, "$defs": {} }
      }
    }`)).to.eql([useDefinitions]);
  });

  test("a property named definitions", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "definitions": { "type": "object" } } }`)).to.eql([]);
  });

  test("v1 reports unknown keywords itself", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "definitions": {} }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["unknown-keyword"]);
  });
});
