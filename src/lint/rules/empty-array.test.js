import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import emptyArray from "./empty-array.js";

const v1 = "https://json-schema.org/v1";
const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("empty-array", () => {
  test("an empty array", async () => {
    const json = `{ "$schema": "${draft202012}", "allOf": [] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'allOf' can't be empty"]);
    expect(file.messages[0].ruleId).to.equal("empty-array");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf("[]");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 3, offset: offset + 2 }
    });
  });

  test("anyOf, oneOf, and prefixItems", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "anyOf": [], "oneOf": [], "prefixItems": [] }`)).to.eql([
      "'anyOf' can't be empty",
      "'oneOf' can't be empty",
      "'prefixItems' can't be empty"
    ]);
  });

  test("v1's type and conditional", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "type": [], "conditional": [] }`)).to.eql([
      "'type' can't be empty",
      "'conditional' can't be empty"
    ]);
  });

  test("draft-04's required, enum, and dependencies", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "required": [], "enum": [], "dependencies": { "a": [], "b": ["c"] } }`)).to.eql([
      "'required' can't be empty",
      "'enum' can't be empty",
      "'dependencies' for 'a' can't be empty"
    ]);
  });

  test("arrays that can be empty", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": [], "enum": [], "required": [], "dependentRequired": { "a": [] } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft07}", "required": [], "enum": [], "dependencies": { "a": [] } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft04}", "type": [] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft201909}", "items": [] }`)).to.eql([]);
  });

  test("arrays that aren't empty", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "allOf": [{}], "anyOf": [{}] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "oneOf": [] } } }`)).to.have.length(1);
  });

  test("a property named allOf isn't a keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "allOf": { "enum": [] } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(emptyArray)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
