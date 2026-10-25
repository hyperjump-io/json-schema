import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import ignoredRefSiblings from "./ignored-ref-siblings.js";

const draft07 = "http://json-schema.org/draft-07/schema#";

describe("ignored-ref-siblings", () => {
  test("a keyword next to $ref", async () => {
    const json = `{ "$schema": "${draft07}", "definitions": { "a": {} }, "properties": { "foo": { "$ref": "#/definitions/a", "minimum": 0 } } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minimum' is ignored, because '$ref' replaces the schema it's in"]);
    expect(file.messages[0].ruleId).to.equal("ignored-ref-siblings");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"minimum"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 13, offset: offset + 12 }
    });
  });

  test("every sibling is reported", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": {} },
      "properties": { "foo": { "description": "a foo", "$ref": "#/definitions/a", "type": "integer" } }
    }`)).to.eql([
      "'description' is ignored, because '$ref' replaces the schema it's in",
      "'type' is ignored, because '$ref' replaces the schema it's in"
    ]);
  });

  test("at the root, where $schema isn't ignored, but definitions are", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "$ref": "#/definitions/a", "definitions": { "a": {} } }`)).to.eql([
      "'definitions' is ignored, because '$ref' replaces the schema it's in"
    ]);
  });

  test("$comment isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "definitions": { "a": {} }, "items": { "$ref": "#/definitions/a", "$comment": "an a" } }`)).to.eql([]);
  });

  test("$ref alone", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "definitions": { "a": {} }, "items": { "$ref": "#/definitions/a" } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "definitions": { "a": {} }, "items": { "$ref": "#/definitions/a", "type": "string" } }`))
      .to.have.length(1);
  });

  test("$ref is evaluated with its siblings after draft-07", async () => {
    expect(await reasons(`{ "$schema": "https://json-schema.org/draft/2019-09/schema", "$defs": { "a": {} }, "$ref": "#/$defs/a", "type": "string" }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(ignoredRefSiblings)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
