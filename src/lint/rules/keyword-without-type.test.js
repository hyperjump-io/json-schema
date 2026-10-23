import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import keywordWithoutType from "./keyword-without-type.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordWithoutType)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const objects = "'properties' applies only to objects, but there's no 'type', so values of other types are valid";

describe("keyword-without-type", () => {
  test("properties without type", async () => {
    const json = `{ "$schema": "${draft2020}", "properties": { "a": {} }, "required": ["a"] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([objects]);
    expect(file.messages[0].ruleId).to.equal("keyword-without-type");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"properties": { "a": {} }`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("each type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": { "minimum": 0 }, "b": { "maxLength": 1 }, "c": { "minItems": 1 } } }`)).to.eql([
      objects,
      "'minimum' applies only to numbers, but there's no 'type', so values of other types are valid",
      "'maxLength' applies only to strings, but there's no 'type', so values of other types are valid",
      "'minItems' applies only to arrays, but there's no 'type', so values of other types are valid"
    ]);
  });

  test("with type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": {} } }`)).to.eql([]);
  });

  test("const or enum says what type it is", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": { "enum": ["x", "y"], "maxLength": 1 }, "b": { "const": 1, "minimum": 0 } } }`)).to.eql([]);
  });

  test("type in a schema the keyword is combined with", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "anyOf": [{ "required": ["a"] }, { "required": ["b"] }] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "type": "object" }, { "properties": { "a": {} } }] }`)).to.eql([]);
  });

  test("once for each group", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "required": ["a"] }, { "required": ["b"] }], "properties": { "a": {}, "b": {} } }`)).to.eql([
      "'required' applies only to objects, but there's no 'type', so values of other types are valid"
    ]);
  });

  test("a schema in $defs, with the type where it's referenced", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "foo": { "type": "object", "$ref": "#/$defs/a" } }, "$defs": { "a": { "properties": { "b": {} } } } }`)).to.eql([]);
  });

  test("a schema in $defs, without a type where it's referenced", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "foo": { "$ref": "#/$defs/a" } }, "$defs": { "a": { "properties": { "b": {} } } } }`)).to.eql([objects]);
  });

  test("a schema in $defs that nothing here references", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": { "properties": { "b": {} } } } }`)).to.eql([]);
  });

  test("a reference that can't be followed", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$ref": "https://example.com/base", "properties": { "a": {} } }`)).to.eql([]);
  });

  test("a keyword in a not", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": { "not": { "minimum": 3 } } } }`)).to.eql([]);
  });

  test("a schema for property names", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "propertyNames": { "pattern": "^a", "maxLength": 3 } }`)).to.eql([]);
  });

  test("a schema property names reference", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "object",
      "propertyNames": { "$ref": "#/$defs/name" },
      "$defs": { "name": { "pattern": "^a" } }
    }`)).to.eql([]);
  });

  test("a known format", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": { "format": "date" } } }`)).to.eql([
      "The 'date' format applies only to strings, but there's no 'type', so values of other types are valid"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": { "type": "string", "format": "date" } } }`)).to.eql([]);
  });

  test("a format that could apply to any type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "a": { "format": "int32" } } }`)).to.eql([]);
  });

  test("a format in draft-07", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "format": "hostname" }`)).to.eql([
      "The 'hostname' format applies only to strings, but there's no 'type', so values of other types are valid"
    ]);
  });

  test("keywords for every type aren't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "a": { "enum": [1] }, "b": { "allOf": [{}] } }, "type": "object" }`)).to.eql([]);
  });

  test("properties named like keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "minimum": true, "required": true } }`)).to.eql([]);
  });

  test("draft-07", async () => {
    expect(await reasons(`{
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": { "foo": { "$ref": "#/definitions/a" } },
      "definitions": { "a": { "minLength": 1 } }
    }`)).to.eql(["'minLength' applies only to strings, but there's no 'type', so values of other types are valid"]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "maximum": 5 }`)).to.have.length(1);
  });
});
