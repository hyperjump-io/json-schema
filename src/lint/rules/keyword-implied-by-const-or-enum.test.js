import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import keywordImpliedByConstOrEnum from "./keyword-implied-by-const-or-enum.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(keywordImpliedByConstOrEnum)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("keyword-implied-by-const-or-enum", () => {
  test("an assertion every enum value passes", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "enum": ["one", "two"], "minLength": 3 }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'minLength' has no effect, because it allows every value in 'enum'"
    ]);
    expect(file.messages[0].ruleId).to.equal("keyword-implied-by-const-or-enum");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 86, offset: 85 },
      end: { line: 1, column: 100, offset: 99 }
    });
  });

  test("the const value passes", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "const": 5, "maximum": 10, "multipleOf": 5 }`)).to.eql([
      "'maximum' has no effect, because it allows the 'const' value",
      "'multipleOf' has no effect, because it allows the 'const' value"
    ]);
  });

  test("an assertion for another type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [1, 2], "pattern": "^a" }`)).to.eql([
      "'pattern' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("an assertion a value fails", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["one", "three"], "maxLength": 3 }`)).to.eql([]);
  });

  test("objects and arrays", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "enum": [{ "a": 1 }, [1, 2]],
      "required": ["a"],
      "uniqueItems": true,
      "maxProperties": 1
    }`)).to.eql([
      "'required' has no effect, because it allows every value in 'enum'",
      "'uniqueItems' has no effect, because it allows every value in 'enum'",
      "'maxProperties' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("draft-04 limits with their exclusive siblings", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "enum": [4, 5], "maximum": 5, "exclusiveMaximum": true }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft04}", "enum": [4, 5], "maximum": 5, "exclusiveMaximum": false }`)).to.eql([
      "'maximum' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("an assertion with its default value", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["a"], "minLength": 0 }`)).to.eql([]);
  });

  test("type isn't checked", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": ["a"], "type": "string" }`)).to.eql([]);
  });

  test("const and enum together", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "const": "a", "enum": ["a"], "maxLength": 3 }`)).to.eql([]);
  });

  test("without const or enum", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "minLength": 3 }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "enum": [1, 2], "minimum": 0 } }`)).to.eql([
      "'minimum' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "enum": { "const": 1 }, "minimum": { "const": 0 } } }`)).to.eql([]);
  });

  test("an applicator that allows every value", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [1, 2], "allOf": [{ "minimum": 0 }] }`)).to.eql([
      "'allOf' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("a keyword that annotates has an effect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [1, 2], "allOf": [{ "title": "a" }] }`)).to.eql([]);
  });

  test("what a keyword marks has an effect if something reads it", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [{ "a": 1 }], "properties": { "a": { "type": "integer" } } }`)).to.eql([
      "'properties' has no effect, because it allows every value in 'enum'"
    ]);
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "enum": [{ "a": 1 }],
      "properties": { "a": { "type": "integer" } },
      "unevaluatedProperties": false
    }`)).to.eql([
      "'unevaluatedProperties' has no effect, because it allows every value in 'enum'"
    ]);
  });

  test("a keyword that might reject a value isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "enum": [1], "$ref": "https://example.com/nope" }`)).to.eql([]);
  });
});
