import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import propertyNamesType from "./property-names-type.js";

const draft06 = "http://json-schema.org/draft-06/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

const noEffect = "'type' has no effect in 'propertyNames', because property names are always strings";
const nothingValid = "'type' doesn't allow strings, so no property name is valid, and only objects without properties are";

describe("property-names-type", () => {
  test("type string", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "propertyNames": { "type": "string", "pattern": "^a" } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([noEffect]);
    expect(file.messages[0].ruleId).to.equal("property-names-type");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 81, offset: 80 },
      end: { line: 1, column: 97, offset: 96 }
    });
  });

  test("an array with string", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "propertyNames": { "type": ["string", "null"] } }`)).to.eql([noEffect]);
  });

  test("a type without string", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "propertyNames": { "type": "integer" } }`)).to.eql([nothingValid]);
  });

  test("without type", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "propertyNames": { "pattern": "^a" } }`)).to.eql([]);
  });

  test("a boolean schema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "propertyNames": false }`)).to.eql([]);
  });

  test("type in a schema it references isn't checked", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "propertyNames": { "$ref": "#/$defs/name" },
      "$defs": { "name": { "type": "string" } }
    }`)).to.eql([]);
  });

  test("in draft-06", async () => {
    expect(await reasons(`{ "$schema": "${draft06}", "propertyNames": { "type": "string" } }`)).to.eql([noEffect]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "propertyNames": { "type": "string" } } }`)).to.eql([noEffect]);
  });

  test("a property named propertyNames", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "propertyNames": { "type": "string" } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(propertyNamesType)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
